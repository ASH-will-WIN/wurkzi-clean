const { prisma, stripeClient } = require("../db");
const { awardReferralRewardsForJob } = require("../services/referralService");
const { awardLeaderboardPointsForJob } = require("../services/leaderboardService");
const { processJobIncentive } = require("../services/jobIncentiveService");
const { createNotification } = require("../services/notificationService");

const PLATFORM_FEE_RATE = 0.1;

async function notifyJobPayment(payment, io, type = "JOB_PAID") {
  const job = await prisma.job.findUnique({ where: { id: payment.jobId }, select: { title: true } });
  const label = type === "JOB_COMPLETED" ? "Job completed" : "Payment recorded";
  const body = type === "JOB_COMPLETED"
    ? `${job?.title || "A job"} was marked complete.`
    : `Payment for ${job?.title || "your job"} was recorded.`;
  await Promise.all([payment.hirerId, payment.workerId].map((recipientId) =>
    createNotification({
      recipientId,
      sourceKey: `${type.toLowerCase()}:${payment.jobId}:${recipientId}`,
      type,
      title: label,
      body,
      smsText: body,
      href: `/jobs/${payment.jobId}`,
    }, io).catch((error) => console.error("Job notification failed:", error.message))
  ));
}

async function notifyJobCompletion(job, workerId, io) {
  const body = `${job.title || "A job"} was marked complete.`;
  await Promise.all([job.hirerId, workerId].map((recipientId) =>
    createNotification({
      recipientId,
      sourceKey: `job_completed:${job.id}:${recipientId}`,
      type: "JOB_COMPLETED",
      title: "Job completed",
      body,
      smsText: body,
      href: `/jobs/${job.id}`,
    }, io).catch((error) => console.error("Job completion notification failed:", error.message))
  ));
}

async function markPaymentPaid(paymentId, io = null) {
  const claimed = await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date() },
  });
  if (!claimed.count) return prisma.payment.findUnique({ where: { id: paymentId } });
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  try { await notifyJobPayment(payment, io); } catch (error) { console.error("Payment notification failed:", error.message); }
  await Promise.all([
    processJobIncentive(payment.jobId).catch((error) => console.error("Job incentive processing failed:", error.message)),
    awardPostPaymentRewards(payment.jobId),
  ]);
  return payment;
}

async function markPaymentFailedAndRestoreCredits(paymentId) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status !== "PENDING") return payment;
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED", creditsRestoredAt: new Date() },
    });
    if (payment.referralCreditAppliedCents || payment.referralDiscountCents) {
      await tx.userProfile.update({
        where: { userId: payment.hirerId },
        data: {
          ...(payment.referralCreditAppliedCents ? { platformCreditCents: { increment: payment.referralCreditAppliedCents } } : {}),
          ...(payment.referralDiscountCents ? { postingDiscountCount: { increment: 1 } } : {}),
        },
      });
    }
    return { ...payment, status: "FAILED" };
  });
}

async function createPayment(req, res) {
  let paymentIntent;
  try {
    const { job_id, amount, hirer_id, worker_id } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "invalid_amount",
        message: "Amount must be a positive number",
      });
    }

    // Full amount goes to worker (Legacy 90/10 split removed)
    const platformFee = 0;
    const workerAmount = amount;

    paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      payment_method_types: ["card"],
      metadata: { job_id, hirer_id, worker_id },
    });

    const payment = await prisma.payment.create({
      data: {
        jobId: job_id,
        amount,
        platformFee, // Add this field
        workerAmount, // Add this field
        hirerId: hirer_id,
        workerId: worker_id,
        stripePaymentId: paymentIntent.id,
        status: "PENDING",
      },
    });

    res.json({ payment, paymentIntent });
  } catch (error) {
    console.error("Payment Error:", error.message);
    if (paymentIntent?.id) {
      await stripeClient.paymentIntents.cancel(paymentIntent.id);
    }
    res.status(500).json({
      error: "payment_failed",
      message: error.message,
    });
  }
}

async function getPayments(req, res) {
  try {
    const { jobId } = req.query;

    const whereClause = {
      OR: [{ hirerId: req.user.id }, { workerId: req.user.id }],
    };
    if (jobId) {
      whereClause.jobId = jobId;
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    // Add data validation to handle potential null values
    const safePayments = payments.map((payment) => ({
      ...payment,
      platformFee: payment.platformFee !== null ? payment.platformFee : 0,
      workerAmount: payment.workerAmount !== null ? payment.workerAmount : 0,
      depositRefund: payment.depositRefund !== null ? payment.depositRefund : 0, // ADD THIS
    }));

    res.json(safePayments);
  } catch (error) {
    console.error("Get Payments Error:", error.message);
    res.status(500).json({
      message: "Error getting payments",
      details: error.message,
    });
  }
}

async function getMyPayments(req, res) {
  try {
    const userId = req.user.id;
    const { role } = req.user.user_metadata || {};
    // We can also infer role or just fetch where they are either hirer or worker

    // Fetch payments where user is either hirer or worker
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { hirerId: userId },
          { workerId: userId }
        ]
      },
      include: {
        job: {
          select: {
            title: true,
            id: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    // Validated response
    const safePayments = payments.map((payment) => ({
      ...payment,
      platformFee: payment.platformFee !== null ? payment.platformFee : 0,
      workerAmount: payment.workerAmount !== null ? payment.workerAmount : 0,
      depositRefund: payment.depositRefund !== null ? payment.depositRefund : 0,
    }));

    res.json(safePayments);
  } catch (error) {
    console.error("Get My Payments Error:", error.message);
    res.status(500).json({
      message: "Error getting your payments",
      details: error.message,
    });
  }
}

async function getPayment(req, res) {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return res.status(404).json({ error: "payment_not_found" });
    if (payment.hirerId !== req.user.id && payment.workerId !== req.user.id) {
      return res.status(403).json({ error: "not_authorized" });
    }
    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting payment" });
  }
}

async function updatePayment(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status,
      },
    });
    res.json(payment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating payment" });
  }
}

async function deletePayment(req, res) {
  try {
    const { id } = req.params;
    await prisma.payment.delete({ where: { id } });
    res.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting payment" });
  }
}

async function createFinalPayment(req, res) {
  let paymentIntent;
  try {
    const { jobId } = req.body; // Remove amount from destructuring

    // Get the job and verify it's completed
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          where: { status: "ACCEPTED" },
          take: 1,
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.hirerId !== req.user.id) {
      return res.status(403).json({ error: "not_authorized", message: "Only the poster can make the final payment." });
    }

    if (job.status !== "COMPLETED") {
      return res.status(400).json({
        error: "job_not_completed",
        message: "Job must be completed before final payment",
      });
    }

    if (job.applications.length === 0) {
      return res.status(400).json({
        error: "no_accepted_application",
        message: "No accepted application found for this job",
      });
    }

    if (await prisma.payment.findFirst({ where: { jobId, status: "PAID" } })) {
      return res.status(409).json({ error: "job_already_paid", message: "This job already has a recorded payment." });
    }

    const workerId = job.applications[0].workerId;
    const hirerId = job.hirerId;

    const listedAmountCents = Math.round(job.price * 100);
    const platformFeeCents = Math.round(listedAmountCents * PLATFORM_FEE_RATE);
    const workerAmountCents = listedAmountCents - platformFeeCents;
    const hirerProfile = await prisma.userProfile.findUnique({ where: { userId: hirerId } });
    const referralCreditAppliedCents = Math.min(hirerProfile?.platformCreditCents || 0, platformFeeCents);
    // A discount never reduces the worker's payout. If a $5 credit already
    // consumes the fee, keep the one-time discount for a future payment.
    const referralDiscountCents = hirerProfile?.postingDiscountCount > 0
      ? Math.min(Math.round(platformFeeCents * 0.1), platformFeeCents - referralCreditAppliedCents)
      : 0;
    const chargedAmountCents = listedAmountCents - referralCreditAppliedCents - referralDiscountCents;
    const platformFeeAfterRewardsCents = platformFeeCents - referralCreditAppliedCents - referralDiscountCents;

    // Verify worker has a connected account with payouts enabled
    const stripeAccount = await prisma.stripeAccount.findUnique({
      where: { userId: workerId },
    });
    if (!stripeAccount) {
      return res.status(400).json({
        error: "worker_not_onboarded",
        message: "Worker has not completed payout onboarding",
      });
    }

    // Fetch latest account status
    const acct = await stripeClient.accounts.retrieve(stripeAccount.accountId);
    if (!acct.charges_enabled) {
      return res.status(400).json({
        error: "worker_not_ready",
        message: "Worker's Stripe account is not ready to receive funds",
      });
    }

    // Create PaymentIntent with application fee and transfer to worker (destination charge)
    paymentIntent = await stripeClient.paymentIntents.create({
      amount: chargedAmountCents,
      currency: "usd",
      payment_method_types: ["card"],
      transfer_data: {
        destination: stripeAccount.accountId,
        amount: workerAmountCents,
      },
      metadata: {
        jobId,
        hirerId,
        workerId,
        type: "FINAL_PAYMENT",
        referralCreditAppliedCents: String(referralCreditAppliedCents),
        referralDiscountCents: String(referralDiscountCents),
      },
    });

    const payment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "jobs" WHERE "id" = ${jobId} FOR UPDATE`;
      const activePayment = await tx.payment.findFirst({ where: { jobId, status: { in: ["PENDING", "PAID"] } } });
      if (activePayment) {
        const error = new Error("A payment for this job is already pending or complete.");
        error.status = 409;
        throw error;
      }
      if (referralCreditAppliedCents || referralDiscountCents) {
        const reserved = await tx.userProfile.updateMany({
          where: {
            userId: hirerId,
            platformCreditCents: { gte: referralCreditAppliedCents },
            postingDiscountCount: { gte: referralDiscountCents > 0 ? 1 : 0 },
          },
          data: {
            ...(referralCreditAppliedCents ? { platformCreditCents: { decrement: referralCreditAppliedCents } } : {}),
            ...(referralDiscountCents ? { postingDiscountCount: { decrement: 1 } } : {}),
          },
        });
        if (!reserved.count) throw new Error("Your available platform credit changed. Please retry payment.");
      }
      return tx.payment.create({
        data: {
          jobId,
          amount: chargedAmountCents / 100,
          platformFee: platformFeeAfterRewardsCents / 100,
          workerAmount: workerAmountCents / 100,
          depositRefund: 0,
          referralCreditAppliedCents,
          referralDiscountCents,
          hirerId,
          workerId,
          stripePaymentId: paymentIntent.id,
          status: "PENDING",
        },
      });
    });

    res.json({
      payment,
      paymentIntent,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    if (paymentIntent?.id) {
      try { await stripeClient.paymentIntents.cancel(paymentIntent.id); } catch (cancelError) { console.error("Payment cleanup error:", cancelError.message); }
    }
    console.error("Final Payment Error:", error.message);
    res.status(error.status || 500).json({
      error: "final_payment_failed",
      message: error.message,
    });
  }
}

async function confirmFinalPayment(req, res) {
  try {
    const { paymentId } = req.params;

    // Get the payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.hirerId !== req.user.id) {
      return res.status(403).json({ error: "not_authorized", message: "Only the poster can confirm this payment." });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({
        error: "invalid_payment_status",
        message: "Payment is not in pending status",
      });
    }

    const intent = payment.stripePaymentId ? await stripeClient.paymentIntents.retrieve(payment.stripePaymentId) : null;
    if (!intent || intent.status !== "succeeded") {
      return res.status(409).json({ error: "payment_not_succeeded", message: "Stripe has not confirmed this payment yet." });
    }
    const updatedPayment = await markPaymentPaid(paymentId, req.app.get("io"));

    // Deposit refund logic removed as per revised business logic (0% platform fee, fee handling on application)
    // No additional transfer needed.

    res.json(updatedPayment);
  } catch (error) {
    console.error("Confirm Final Payment Error:", error.message);
    res.status(500).json({
      error: "payment_confirmation_failed",
      message: error.message,
    });
  }
}

async function markJobPaidInCash(req, res) {
  try {
    const { jobId } = req.body;

    // Get the job and verify it exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          where: { status: "ACCEPTED" },
          take: 1,
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const alreadyPaid = await prisma.payment.findFirst({ where: { jobId, status: "PAID" } });
    if (alreadyPaid) return res.status(409).json({ error: "job_already_paid", message: "This job already has a recorded payment." });

    if (job.applications.length === 0) {
      return res.status(400).json({ error: "No accepted application found." });
    }

    if (!["IN_PROGRESS", "COMPLETED"].includes(job.status)) {
      return res.status(409).json({ error: "job_not_ready_for_cash", message: "The job must be in progress or complete before cash can be recorded." });
    }

    const workerId = job.applications[0].workerId;
    const hirerId = job.hirerId;
    const amount = job.price;

    if (workerId !== req.user.id) {
      return res.status(403).json({ error: "not_authorized", message: "Only the assigned worker can mark a cash payment." });
    }

    const pendingPayments = await prisma.payment.findMany({ where: { jobId, status: "PENDING" } });
    for (const pending of pendingPayments) {
      if (!pending.stripePaymentId) {
        await markPaymentFailedAndRestoreCredits(pending.id);
        continue;
      }
      const intent = await stripeClient.paymentIntents.retrieve(pending.stripePaymentId);
      if (["succeeded", "processing"].includes(intent.status)) {
        return res.status(409).json({ error: "payment_in_progress", message: "A Stripe payment for this job is already processing." });
      }
      if (intent.status !== "canceled") {
        try { await stripeClient.paymentIntents.cancel(intent.id); } catch (error) {
          return res.status(409).json({ error: "payment_cannot_be_cancelled", message: "A Stripe payment attempt must be resolved before cash can be recorded." });
        }
      }
      await markPaymentFailedAndRestoreCredits(pending.id);
    }

    // Create a PAID payment record
    const payment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "jobs" WHERE "id" = ${jobId} FOR UPDATE`;
      const activePayment = await tx.payment.findFirst({ where: { jobId, status: { in: ["PENDING", "PAID"] } } });
      if (activePayment) {
        const error = new Error("A card payment for this job is already pending or complete.");
        error.status = 409;
        throw error;
      }
      const created = await tx.payment.create({
        data: {
          jobId,
          amount,
          platformFee: 0,
          workerAmount: amount,
          hirerId,
          workerId,
          stripePaymentId: `CASH_PAYMENT_${jobId}`,
          status: "PAID",
          paidAt: new Date(),
        },
      });
      if (job.status !== "COMPLETED") {
        await tx.job.update({ where: { id: jobId }, data: { status: "COMPLETED" } });
      }
      return created;
    });

    try {
      if (job.status !== "COMPLETED") await notifyJobCompletion(job, workerId, req.app.get("io"));
      await notifyJobPayment(payment, req.app.get("io"));
    } catch (error) {
      console.error("Cash payment notification failed:", error.message);
    }
    await Promise.all([
      processJobIncentive(jobId).catch((error) => console.error("Job incentive processing failed:", error.message)),
      awardPostPaymentRewards(jobId),
    ]);

    res.json({ message: "Job marked as paid in cash", payment });

  } catch (error) {
    console.error("Mark Job Paid In Cash Error:", error.message);
    res.status(error.status || 500).json({
      error: "cash_payment_failed",
      message: error.message,
    });
  }
}

async function awardPostPaymentRewards(jobId) {
  try {
    await Promise.all([awardReferralRewardsForJob(jobId), awardLeaderboardPointsForJob(jobId)]);
  } catch (error) {
    // Payment completion must remain successful if a non-financial reward retry fails.
    console.error("Post-payment reward processing failed:", error.message);
  }
}

async function getWorkerEarnings(req, res) {
  try {
    const workerId = req.user.id;

    // Sum all payments where the user is the worker and status is PAID
    const payments = await prisma.payment.aggregate({
      _sum: {
        workerAmount: true,
      },
      where: {
        workerId: workerId,
        status: "PAID",
      },
    });

    const totalEarnings = payments._sum.workerAmount || 0;

    res.json({ totalEarnings });
  } catch (error) {
    console.error("Get Worker Earnings Error:", error.message);
    res.status(500).json({
      error: "earnings_retrieval_failed",
      message: "Failed to retrieve worker earnings",
      details: error.message,
    });
  }
}

module.exports = {
  createPayment,
  getPayments,
  getPayment,
  updatePayment,
  deletePayment,
  createFinalPayment,
  confirmFinalPayment,
  markJobPaidInCash,
  markPaymentPaid,
  markPaymentFailedAndRestoreCredits,
  getMyPayments,
  getWorkerEarnings,
};
