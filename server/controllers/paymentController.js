const { prisma, stripeClient } = require("../db");
const { awardReferralRewardsForJob } = require("../services/referralService");
const { awardLeaderboardPointsForJob } = require("../services/leaderboardService");

const PLATFORM_FEE_RATE = 0.1;

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

    let whereClause = {};
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
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: chargedAmountCents,
      currency: "usd",
      payment_method_types: ["card"],
      transfer_data: {
        destination: stripeAccount.accountId,
        amount: workerAmountCents,
      },
      metadata: { jobId, hirerId, workerId, type: "FINAL_PAYMENT", referralCreditAppliedCents, referralDiscountCents },
    });

    const payment = await prisma.$transaction(async (tx) => {
      if (referralCreditAppliedCents || referralDiscountCents) {
        await tx.userProfile.update({
          where: { userId: hirerId },
          data: {
            ...(referralCreditAppliedCents ? { platformCreditCents: { decrement: referralCreditAppliedCents } } : {}),
            ...(referralDiscountCents ? { postingDiscountCount: { decrement: 1 } } : {}),
          },
        });
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
    console.error("Final Payment Error:", error.message);
    res.status(500).json({
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

    // Mark payment as paid
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "PAID" },
    });

    await awardPostPaymentRewards(updatedPayment.jobId);

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

    // Verify user authorization (must be worker or hirer, ideally worker initiates but hirer confirms? 
    // Requirement says "Add a button on the worker side... marks the job as complete"
    // So we trust the worker (or logic implies they got cash). 
    // Let's verify the user is the assigned worker.

    // Check authentication
    /* 
       NOTE: In a real prod app we might want the Hirer to confirm cash payment.
       But user request says "button on the worker side... marks the job as complete and everything done".
       So we will allow worker to do this.
    */

    // (Assuming middleware populates req.user - wait, looking at other controllers, they decode token manually sometimes?
    // createPayment didn't look like it did manually, checks req.body. Let's look at markJobPaidInCash context.
    // We should rely on req.user if auth middleware is used.
    // Looking at paymentController.js imports... it doesn't import auth middleware but likely uses it in routes.
    // I'll assume req.user is available OR I'll check how other sensitive ops are secured.
    // finalPayment uses ensureAuthenticated in route probably?
    // Let's look at jobController.js -> it manually decodes token in some places.
    // Safe bet: stick to simple logic first, maybe check existing patterns.
    // createFinalPayment checks "worker_not_onboarded" etc but doesn't explicitly check req.user vs workerId in body??
    // Actually createFinalPayment takes jobId from body.

    // Let's proceed with robust check for Worker.

    if (job.status !== "COMPLETED" && job.status !== "IN_PROGRESS") {
      // The user said "bypasses stripe stuff and marks job as complete".
      // If it's IN_PROGRESS, we should probably mark it COMPLETED too?
      // Request: "marks the job as complete and everything done"
      // So if it is IN_PROGRESS, we upgrade it.
    }

    if (job.applications.length === 0) {
      return res.status(400).json({ error: "No accepted application found." });
    }

    const workerId = job.applications[0].workerId;
    const hirerId = job.hirerId;
    const amount = job.price;

    if (workerId !== req.user.id) {
      return res.status(403).json({ error: "not_authorized", message: "Only the assigned worker can mark a cash payment." });
    }

    // Create a PAID payment record
    const payment = await prisma.payment.create({
      data: {
        jobId,
        amount,
        platformFee: 0,
        workerAmount: amount, // Full cash amount
        hirerId,
        workerId,
        stripePaymentId: "CASH_PAYMENT_" + Date.now(),
        status: "PAID",
      },
    });

    // Ensure Job is marked COMPLETED
    if (job.status !== "COMPLETED") {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "COMPLETED" },
      });
    }

    await awardPostPaymentRewards(jobId);

    res.json({ message: "Job marked as paid in cash", payment });

  } catch (error) {
    console.error("Mark Job Paid In Cash Error:", error.message);
    res.status(500).json({
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
  getMyPayments,
  getWorkerEarnings,
};
