const {
  prisma,
  JobStatus,
  ApplicationStatus,
  DepositStatus,
  supabase,
  stripeClient,
} = require("../db");
const { createNotification } = require("../services/notificationService");

async function notifyApplication(application, status, io) {
  const hirerId = application.job?.hirerId;
  const jobTitle = application.job?.title || "your job";
  if (status === "SUBMITTED" && hirerId) {
    try { await createNotification({
      recipientId: hirerId,
      sourceKey: `application:${application.id}:submitted`,
      type: "NEW_APPLICATION",
      title: "New job application",
      body: `A worker applied for ${jobTitle}.`,
      smsText: `A worker applied for ${jobTitle}.`,
      href: `/jobs/${application.jobId}`,
    }, io); } catch (error) { console.error("Application notification failed:", error.message); }
    return;
  }
  const accepted = status === "ACCEPTED";
  try { await createNotification({
    recipientId: application.workerId,
    sourceKey: `application:${application.id}:${status.toLowerCase()}`,
    type: accepted ? "APPLICATION_ACCEPTED" : "APPLICATION_REJECTED",
    title: accepted ? "Application accepted" : "Application update",
    body: accepted ? `Your application for ${jobTitle} was accepted.` : `Your application for ${jobTitle} was rejected.`,
    smsText: accepted ? `Your application for ${jobTitle} was accepted.` : `Your application for ${jobTitle} was rejected.`,
    href: `/jobs/${application.jobId}`,
  }, io); } catch (error) { console.error("Application notification failed:", error.message); }
}

function emitApplicationStatus(io, application, status) {
  if (!io) return;
  io.to(application.workerId).to(application.job?.hirerId).emit("application:status", {
    jobId: application.jobId,
    applicationId: application.id,
    workerId: application.workerId,
    status,
  });
}

async function releaseApplicationDeposit(application) {
  if (!application.depositId) return;
  const intent = await stripeClient.paymentIntents.retrieve(application.depositId);
  if (intent.status === "canceled") return;
  if (intent.status === "succeeded") {
    await stripeClient.refunds.create({ payment_intent: intent.id }, {
      idempotencyKey: `wurkzi-release-application-deposit-${application.id}`,
    });
    return;
  }
  if (["requires_capture", "requires_payment_method", "requires_confirmation", "requires_action"].includes(intent.status)) {
    await stripeClient.paymentIntents.cancel(intent.id);
    return;
  }
  const error = new Error("The application deposit is still processing. Try again once Stripe finishes.");
  error.status = 409;
  throw error;
}

const APPLICATION_DEPOSIT_CENTS = 500;

function getDepositBreakdown(creditAvailableCents = 0) {
  const creditAppliedCents = Math.min(Math.max(0, creditAvailableCents), APPLICATION_DEPOSIT_CENTS);
  return {
    depositAmountCents: APPLICATION_DEPOSIT_CENTS,
    creditAvailableCents: Math.max(0, creditAvailableCents),
    creditAppliedCents,
    amountDueCents: APPLICATION_DEPOSIT_CENTS - creditAppliedCents,
  };
}

async function getApplicationDepositQuote(req, res) {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) return res.status(404).json({ error: "job_not_found", message: "Job not found." });
    if (job.status !== JobStatus.PENDING) {
      return res.status(400).json({ error: "job_not_pending", message: "This job is no longer accepting applications." });
    }
    if (job.hirerId === req.user.id) {
      return res.status(400).json({ error: "cannot_apply_to_own_job", message: "You cannot apply to your own job." });
    }
    const profile = await prisma.userProfile.findUnique({ where: { userId: req.user.id }, select: { platformCreditCents: true } });
    res.json(getDepositBreakdown(profile?.platformCreditCents || 0));
  } catch (error) {
    console.error("Application deposit quote error:", error.message);
    res.status(500).json({ error: "deposit_quote_failed", message: "Could not load the application deposit." });
  }
}

async function authorizeDepositFromIntent(paymentIntent, io = null) {
  if (!paymentIntent?.id || !["requires_capture", "succeeded"].includes(paymentIntent.status)) return null;
  const applicationId = paymentIntent.metadata?.applicationId;
  if (!applicationId) return null;
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: { select: { hirerId: true, title: true } } },
  });
  if (!application || application.depositId !== paymentIntent.id) return null;
  const expectedAmount = APPLICATION_DEPOSIT_CENTS - application.depositCreditAppliedCents;
  if (paymentIntent.currency !== "usd" || paymentIntent.amount !== expectedAmount) return null;
  const updated = await prisma.jobApplication.updateMany({
    where: {
      id: application.id,
      depositStatus: DepositStatus.PENDING,
      status: { in: [ApplicationStatus.PENDING_PAYMENT, ApplicationStatus.APPLIED] },
    },
    data: {
      status: ApplicationStatus.APPLIED,
      depositStatus: paymentIntent.status === "succeeded" ? DepositStatus.CAPTURED : DepositStatus.AUTHORIZED,
    },
  });
  if (updated.count) await notifyApplication(application, "SUBMITTED", io);
  return prisma.jobApplication.findUnique({ where: { id: application.id }, include: { job: true } });
}

async function prepareApplicationPayment(application, io = null) {
  if (!application) {
    const error = new Error("Application not found.");
    error.status = 404;
    throw error;
  }
  if (!application.job) {
    application = await prisma.jobApplication.findUnique({
      where: { id: application.id },
      include: { job: { select: { id: true, hirerId: true, title: true } } },
    });
  }
  if (!application) {
    const error = new Error("Application not found.");
    error.status = 404;
    throw error;
  }
  const amountDueCents = APPLICATION_DEPOSIT_CENTS - application.depositCreditAppliedCents;
  if (amountDueCents <= 0) {
    let submittedApplication = application;
    if (application.status === ApplicationStatus.PENDING_PAYMENT || application.depositStatus === DepositStatus.PENDING) {
      const updated = await prisma.jobApplication.updateMany({
        where: { id: application.id, status: application.status, depositStatus: DepositStatus.PENDING },
        data: { status: ApplicationStatus.APPLIED, depositStatus: DepositStatus.AUTHORIZED },
      });
      if (updated.count) await notifyApplication(application, "SUBMITTED", io);
      submittedApplication = await prisma.jobApplication.findUnique({ where: { id: application.id }, include: { job: true } });
    }
    return { application: submittedApplication, clientSecret: null, submitted: submittedApplication?.status === ApplicationStatus.APPLIED, ...getDepositBreakdown(application.depositCreditAppliedCents) };
  }

  let intent;
  if (application.depositId) {
    intent = await stripeClient.paymentIntents.retrieve(application.depositId);
  } else {
    intent = await stripeClient.paymentIntents.create({
      amount: amountDueCents,
      currency: "usd",
      capture_method: "manual",
      metadata: { jobId: application.jobId, applicationId: application.id, type: "DEPOSIT" },
    }, { idempotencyKey: `application-deposit-${application.id}` });
    try {
      await prisma.jobApplication.update({ where: { id: application.id }, data: { depositId: intent.id } });
    } catch (error) {
      try { await stripeClient.paymentIntents.cancel(intent.id); } catch (cleanupError) { console.error("Deposit cleanup error:", cleanupError.message); }
      throw error;
    }
  }

  if (intent.status === "requires_capture" || intent.status === "succeeded") {
    const submittedApplication = await authorizeDepositFromIntent(intent, io);
    return {
      application: submittedApplication || application,
      clientSecret: null,
      submitted: Boolean(submittedApplication),
      ...getDepositBreakdown(application.depositCreditAppliedCents),
    };
  }

  if (intent.status === "canceled") {
    const canceledIntentId = intent.id;
    intent = await stripeClient.paymentIntents.create({
      amount: amountDueCents,
      currency: "usd",
      capture_method: "manual",
      metadata: { jobId: application.jobId, applicationId: application.id, type: "DEPOSIT" },
    }, { idempotencyKey: `application-deposit-${application.id}-retry-${canceledIntentId}` });
    try {
      await prisma.jobApplication.update({ where: { id: application.id }, data: { depositId: intent.id, depositStatus: DepositStatus.PENDING } });
    } catch (error) {
      try { await stripeClient.paymentIntents.cancel(intent.id); } catch (cleanupError) { console.error("Deposit cleanup error:", cleanupError.message); }
      throw error;
    }
  }

  if (!["requires_payment_method", "requires_confirmation", "requires_action"].includes(intent.status)) {
    const error = new Error("The application payment is still processing. Please try again shortly.");
    error.status = 409;
    throw error;
  }
  return {
    application: { ...application, depositId: intent.id },
    clientSecret: intent.client_secret,
    submitted: false,
    ...getDepositBreakdown(application.depositCreditAppliedCents),
  };
}

async function createApplication(req, res) {
  let createdApplication = null;
  let reservedCreditCents = 0;
  let pendingPaymentIntentId = null;
  try {
    const { jobId, message } = req.body;
    const workerId = req.user?.id;

    if (!message || message.trim() === "") return res.status(400).json({ error: "Message is required" });
    if (/\d/.test(message)) {
      return res.status(400).json({ error: "invalid_message", message: "Message cannot contain numbers." });
    }

    const [job, existingApplication] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId } }),
      prisma.jobApplication.findFirst({ where: { jobId, workerId } }),
    ]);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.hirerId === workerId) return res.status(400).json({ error: "cannot_apply_to_own_job", message: "You cannot apply to your own job." });
    if (job.status !== JobStatus.PENDING) {
      return res.status(400).json({ error: "job_not_pending", message: "Job is not available for application." });
    }

    if (existingApplication) {
      if (existingApplication.status === ApplicationStatus.PENDING_PAYMENT || (existingApplication.status === ApplicationStatus.APPLIED && existingApplication.depositStatus === DepositStatus.PENDING)) {
        if (existingApplication.status !== ApplicationStatus.PENDING_PAYMENT) {
          existingApplication.status = ApplicationStatus.PENDING_PAYMENT;
          await prisma.jobApplication.update({ where: { id: existingApplication.id }, data: { status: ApplicationStatus.PENDING_PAYMENT } });
        }
        const resumed = await prepareApplicationPayment(existingApplication, req.app.get("io"));
        return res.status(200).json(resumed);
      }
      return res.status(400).json({
        error: "duplicate_application",
        message: existingApplication.status === ApplicationStatus.WITHDRAWN
          ? "You withdrew this application. Its conversation history is still available read-only."
          : "You have already applied for this job.",
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const currentJob = await tx.job.findUnique({ where: { id: jobId }, select: { id: true, status: true, hirerId: true } });
      if (!currentJob || currentJob.status !== JobStatus.PENDING || currentJob.hirerId === workerId) {
        const error = new Error(currentJob?.hirerId === workerId ? "You cannot apply to your own job." : "Job is not available for application.");
        error.status = 409;
        throw error;
      }
      const existing = await tx.jobApplication.findFirst({ where: { jobId, workerId } });
      if (existing) {
        const error = new Error(existing.status === ApplicationStatus.PENDING_PAYMENT
          ? "An application payment is already in progress. Refresh to resume it."
          : "You have already applied for this job.");
        error.status = 409;
        throw error;
      }
      const profile = await tx.userProfile.findUnique({ where: { userId: workerId }, select: { platformCreditCents: true } });
      const availableCredit = Math.max(0, profile?.platformCreditCents || 0);
      reservedCreditCents = Math.min(availableCredit, APPLICATION_DEPOSIT_CENTS);
      if (reservedCreditCents) {
        const reserved = await tx.userProfile.updateMany({
          where: { userId: workerId, platformCreditCents: { gte: reservedCreditCents } },
          data: { platformCreditCents: { decrement: reservedCreditCents } },
        });
        if (!reserved.count) {
          const error = new Error("Your available credit changed. Refresh the deposit amount and try again.");
          error.status = 409;
          throw error;
        }
      }
      const amountDueCents = APPLICATION_DEPOSIT_CENTS - reservedCreditCents;
      return tx.jobApplication.create({
        data: {
          jobId,
          workerId,
          message: message.trim(),
          depositStatus: amountDueCents ? DepositStatus.PENDING : DepositStatus.AUTHORIZED,
          depositCreditAppliedCents: reservedCreditCents,
          status: amountDueCents ? ApplicationStatus.PENDING_PAYMENT : ApplicationStatus.APPLIED,
        },
        include: { job: { select: { id: true, hirerId: true, title: true } } },
      });
    });

    createdApplication = created;
    if (APPLICATION_DEPOSIT_CENTS - reservedCreditCents === 0) {
      await notifyApplication(createdApplication, "SUBMITTED", req.app.get("io"));
      return res.status(201).json({
        application: createdApplication,
        clientSecret: null,
        submitted: true,
        usedReferralCredit: true,
        ...getDepositBreakdown(reservedCreditCents),
      });
    }

    const prepared = await prepareApplicationPayment(createdApplication, req.app.get("io"));
    pendingPaymentIntentId = prepared.application?.depositId || null;
    return res.status(201).json({ ...prepared, usedReferralCredit: reservedCreditCents > 0 });
  } catch (error) {
    if (createdApplication && createdApplication.status === ApplicationStatus.PENDING_PAYMENT) {
      if (pendingPaymentIntentId) {
        try { await stripeClient.paymentIntents.cancel(pendingPaymentIntentId); } catch (cleanupError) { console.error("Deposit cleanup error:", cleanupError.message); }
      }
      try {
        await prisma.$transaction(async (tx) => {
          await tx.jobApplication.delete({ where: { id: createdApplication.id } });
          if (reservedCreditCents) await tx.userProfile.update({ where: { userId: createdApplication.workerId }, data: { platformCreditCents: { increment: reservedCreditCents } } });
        });
      } catch (cleanupError) { console.error("Application cleanup error:", cleanupError.message); }
    }
    console.error("Application Creation Error:", error.message);
    res.status(error.status || 500).json({
      error: error.status ? "application_not_ready" : "application_creation_failed",
      message: error.message || "Failed to create job application.",
    });
  }
}

async function resumeApplicationDeposit(req, res) {
  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: req.params.id },
      include: { job: true },
    });
    if (!application) return res.status(404).json({ error: "application_not_found" });
    if (application.workerId !== req.user.id) return res.status(403).json({ error: "not_application_owner" });
    if (application.status === ApplicationStatus.APPLIED && [DepositStatus.AUTHORIZED, DepositStatus.CAPTURED].includes(application.depositStatus)) {
      return res.json({ application, clientSecret: null, submitted: true, ...getDepositBreakdown(application.depositCreditAppliedCents) });
    }
    if (![ApplicationStatus.PENDING_PAYMENT, ApplicationStatus.APPLIED].includes(application.status) || application.depositStatus !== DepositStatus.PENDING) {
      return res.status(409).json({ error: "application_not_pending", message: "This application is no longer awaiting payment." });
    }
    if (application.job.status !== JobStatus.PENDING) {
      return res.status(409).json({ error: "job_not_pending", message: "This job is no longer accepting applications." });
    }
    if (application.status !== ApplicationStatus.PENDING_PAYMENT) {
      await prisma.jobApplication.update({ where: { id: application.id }, data: { status: ApplicationStatus.PENDING_PAYMENT } });
      application.status = ApplicationStatus.PENDING_PAYMENT;
    }
    const result = await prepareApplicationPayment(application, req.app.get("io"));
    res.json(result);
  } catch (error) {
    console.error("Resume application deposit error:", error.message);
    res.status(error.status || 500).json({ error: "deposit_resume_failed", message: error.message || "Could not resume the application payment." });
  }
}

async function confirmApplicationDeposit(req, res) {
  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: req.params.id },
      include: { job: { select: { hirerId: true, title: true } } },
    });
    if (!application) return res.status(404).json({ error: "application_not_found" });
    if (application.workerId !== req.user.id) return res.status(403).json({ error: "not_application_owner" });
    if (application.status === ApplicationStatus.APPLIED && [DepositStatus.AUTHORIZED, DepositStatus.CAPTURED].includes(application.depositStatus)) {
      return res.json({ application, authorized: true });
    }
    if (!application.depositId) return res.status(400).json({ error: "deposit_not_found" });

    const intent = await stripeClient.paymentIntents.retrieve(application.depositId);
    const expectedAmount = APPLICATION_DEPOSIT_CENTS - application.depositCreditAppliedCents;
    if (intent.metadata?.applicationId !== application.id || intent.currency !== "usd" || intent.amount !== expectedAmount || !["requires_capture", "succeeded"].includes(intent.status)) {
      return res.status(409).json({ error: "deposit_not_authorized", message: "The deposit has not been authorized yet." });
    }
    const updated = await authorizeDepositFromIntent(intent, req.app.get("io"));
    if (!updated) return res.status(409).json({ error: "application_not_eligible" });
    res.json({ application: updated, authorized: true });
  } catch (error) {
    console.error("Confirm application deposit error:", error.message);
    res.status(500).json({ error: "deposit_confirmation_failed", message: "Could not confirm the application deposit." });
  }
}

async function getApplications(req, res) {
  try {
    const workerId = req.user?.id;

    const applications = await prisma.jobApplication.findMany({
      where: {
        workerId,
        status: { not: ApplicationStatus.PENDING_PAYMENT },
        depositStatus: { in: [DepositStatus.AUTHORIZED, DepositStatus.CAPTURED, DepositStatus.REFUNDED] },
      },
      include: {
        job: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(applications);
  } catch (error) {
    console.error("Get Applications Error:", error.message);
    res.status(500).json({
      error: "applications_retrieval_failed",
      message: "Failed to retrieve applications",
      details: error.message,
    });
  }
}

async function getJobApplications(req, res) {
  try {
    const { jobId } = req.params;
    const hirerId = req.user.id;

    // Verify the job exists and belongs to the hirer
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.hirerId !== hirerId) {
      return res.status(403).json({
        error: "not_job_owner",
        message: "You don't have permission to view applications for this job",
      });
    }

    const applications = await prisma.jobApplication.findMany({
      where: {
        jobId,
        status: { not: ApplicationStatus.PENDING_PAYMENT },
        depositStatus: { in: [DepositStatus.AUTHORIZED, DepositStatus.CAPTURED, DepositStatus.REFUNDED] },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(applications);
  } catch (error) {
    console.error("Get Job Applications Error:", error.message);
    res.status(500).json({
      error: "job_applications_retrieval_failed",
      message: "Failed to retrieve job applications",
      details: error.message,
    });
  }
}

async function acceptApplication(req, res) {
  try {
    const { id } = req.params;

    // Get the application and verify it's in APPLIED status
    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: true,
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.job.hirerId !== req.user.id) {
      return res.status(403).json({ error: "not_job_owner", message: "Only the hirer can accept this application." });
    }

    if (application.status !== ApplicationStatus.APPLIED) {
      return res.status(400).json({
        error: "invalid_status",
        message: "Application is not in a state that can be accepted",
      });
    }

    if (![DepositStatus.AUTHORIZED, DepositStatus.CAPTURED].includes(application.depositStatus)) {
      return res.status(409).json({ error: "deposit_not_authorized", message: "The worker must confirm the $5 deposit before acceptance." });
    }

    // Check if the job already has an accepted application
    const existingAcceptedApp = await prisma.jobApplication.findFirst({
      where: {
        jobId: application.jobId,
        status: ApplicationStatus.ACCEPTED,
      },
    });

    if (existingAcceptedApp) {
      return res.status(400).json({
        error: "job_already_has_accepted_application",
        message: "This job already has an accepted application",
      });
    }

    const otherApplicants = await prisma.jobApplication.findMany({
      where: { jobId: application.jobId, id: { not: id }, status: ApplicationStatus.APPLIED },
      select: { workerId: true },
    });

    // Capture the $5 deposit
    try {
      if (application.depositId && application.depositStatus !== DepositStatus.CAPTURED) {
        const intent = await stripeClient.paymentIntents.retrieve(application.depositId);
        if (intent.status === "requires_capture") await stripeClient.paymentIntents.capture(application.depositId);
        else if (intent.status !== "succeeded") throw new Error("The worker's deposit is not ready to capture.");
      }
    } catch (stripeError) {
      console.error("Stripe Capture Error:", stripeError.message);
      return res.status(500).json({
        error: "payment_capture_failed",
        message: "Failed to capture the worker's deposit. Application cannot be accepted.",
        details: stripeError.message,
      });
    }

    // Update job status to COMMITTED and update application status
    // Use a transaction to ensure both happen or neither
    const [updatedJob, updatedApplication] = await prisma.$transaction([
      prisma.job.update({
        where: { id: application.jobId },
        data: { status: JobStatus.COMMITTED },
      }),
      prisma.jobApplication.update({
        where: { id },
        data: {
          status: ApplicationStatus.ACCEPTED,
          depositStatus: DepositStatus.CAPTURED,
        },
      }),
    ]);

    emitApplicationStatus(req.app.get("io"), { ...updatedApplication, job: application.job }, "ACCEPTED");
    for (const applicant of otherApplicants) {
      req.app.get("io")?.to(applicant.workerId).emit("job:status", { jobId: application.jobId, status: JobStatus.COMMITTED });
    }
    await notifyApplication({ ...updatedApplication, job: application.job }, "ACCEPTED", req.app.get("io"));
    res.json(updatedApplication);

  } catch (error) {
    console.error("Accept Application Error:", error.message);
    res.status(500).json({
      error: "application_accept_failed",
      message: "Failed to accept application",
      details: error.message,
    });
  }
}

async function rejectApplication(req, res) {
  try {
    const { id } = req.params;

    // Get the application
    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: { job: { select: { hirerId: true, title: true } } },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.job.hirerId !== req.user.id) {
      return res.status(403).json({ error: "not_job_owner", message: "Only the hirer can reject this application." });
    }

    if (application.status !== ApplicationStatus.APPLIED) {
      return res.status(400).json({
        error: "invalid_status",
        message: "Application is not in a state that can be rejected",
      });
    }

    await releaseApplicationDeposit(application);

    // Update application status
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const claimed = await tx.jobApplication.updateMany({
        where: { id, status: ApplicationStatus.APPLIED },
        data: { status: ApplicationStatus.REJECTED, depositStatus: DepositStatus.REFUNDED },
      });
      if (!claimed.count) {
        const error = new Error("This application has already changed.");
        error.status = 409;
        throw error;
      }
      const updated = await tx.jobApplication.findUnique({ where: { id } });
      if (application.depositCreditAppliedCents) {
        await tx.userProfile.update({ where: { userId: application.workerId }, data: { platformCreditCents: { increment: application.depositCreditAppliedCents } } });
      }
      return updated;
    });
    await notifyApplication({ ...updatedApplication, job: application.job }, "REJECTED", req.app.get("io"));
    emitApplicationStatus(req.app.get("io"), { ...updatedApplication, job: application.job }, "REJECTED");

    res.json(updatedApplication);
  } catch (error) {
    console.error("Reject Application Error:", error.message);
    res.status(error.status || 500).json({
      error: "application_reject_failed",
      message: "Failed to reject application",
      details: error.message,
    });
  }
}



async function withdrawApplication(req, res) {
  try {
    const { id } = req.params;
    const workerId = req.user.id;

    // Get the application and verify it belongs to the worker and is in APPLIED status
    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: { job: { select: { hirerId: true } } },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.workerId !== workerId) {
      return res.status(403).json({
        error: "not_application_owner",
        message: "You don't have permission to withdraw this application",
      });
    }

    if (application.status !== ApplicationStatus.APPLIED) {
      return res.status(400).json({
        error: "invalid_status",
        message: `Application in status ${application.status} cannot be withdrawn`,
      });
    }

    await releaseApplicationDeposit(application);

    // Update application status
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const claimed = await tx.jobApplication.updateMany({
        where: { id, status: ApplicationStatus.APPLIED },
        data: { status: ApplicationStatus.WITHDRAWN, depositStatus: DepositStatus.REFUNDED },
      });
      if (!claimed.count) {
        const error = new Error("This application has already changed.");
        error.status = 409;
        throw error;
      }
      const updated = await tx.jobApplication.findUnique({ where: { id } });
      if (application.depositCreditAppliedCents) {
        await tx.userProfile.update({ where: { userId: workerId }, data: { platformCreditCents: { increment: application.depositCreditAppliedCents } } });
      }
      return updated;
    });
    emitApplicationStatus(req.app.get("io"), { ...updatedApplication, job: application.job }, "WITHDRAWN");

    res.json(updatedApplication);
  } catch (error) {
    console.error("Withdraw Application Error:", error.message);
    res.status(error.status || 500).json({
      error: "application_withdrawal_failed",
      message: "Failed to withdraw application",
      details: error.message,
    });
  }
}

module.exports = {
  createApplication,
  getApplicationDepositQuote,
  resumeApplicationDeposit,
  confirmApplicationDeposit,
  authorizeDepositFromIntent,
  getApplications,
  getJobApplications,
  acceptApplication,
  rejectApplication,

  withdrawApplication,
};
