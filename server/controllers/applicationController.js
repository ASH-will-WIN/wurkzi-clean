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

async function authorizeDepositFromIntent(paymentIntent, io = null) {
  if (!paymentIntent?.id || paymentIntent.status !== "requires_capture") return null;
  const applicationId = paymentIntent.metadata?.applicationId;
  if (!applicationId) return null;
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: { select: { hirerId: true, title: true } } },
  });
  if (!application || application.depositId !== paymentIntent.id || application.status !== ApplicationStatus.APPLIED) return null;
  const updated = await prisma.jobApplication.updateMany({
    where: { id: application.id, depositStatus: DepositStatus.PENDING, status: ApplicationStatus.APPLIED },
    data: { depositStatus: DepositStatus.AUTHORIZED },
  });
  if (updated.count) await notifyApplication(application, "SUBMITTED", io);
  return prisma.jobApplication.findUnique({ where: { id: application.id } });
}

async function createApplication(req, res) {
  let reservedCreditWorkerId = null;
  let pendingPaymentIntentId = null;
  let createdApplicationId = null;
  try {
    const { jobId, message } = req.body;

    // Use user_id from Supabase user object if available, fallback to id
    const workerId = req.user?.id;

    // Unified Role: Allow any authenticated user to apply
    // Removed strict WORKER role check

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (/\d/.test(message)) {
      return res.status(400).json({
        error: "invalid_message",
        message: "Message cannot contain numbers."
      });
    }

    // Verify job existence and lack of duplicate application in parallel
    const [job, existingApplication] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId } }),
      prisma.jobApplication.findFirst({
        where: {
          jobId,
          workerId,
        },
      })
    ]);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status !== JobStatus.PENDING) {
      return res.status(400).json({
        error: "job_not_pending",
        message: "Job is not available for application",
      });
    }

    if (existingApplication) {
      return res.status(400).json({
        error: "duplicate_application",
        message: existingApplication.status === ApplicationStatus.WITHDRAWN
          ? "You withdrew this application. Its conversation history is still available read-only."
          : "You have already applied for this job",
      });
    }


    const profile = await prisma.userProfile.findUnique({ where: { userId: workerId } });
    let depositCreditAppliedCents = profile?.platformCreditCents >= 500 ? 500 : 0;
    if (depositCreditAppliedCents) {
      const reserved = await prisma.userProfile.updateMany({
        where: { userId: workerId, platformCreditCents: { gte: 500 } },
        data: { platformCreditCents: { decrement: 500 } },
      });
      if (!reserved.count) depositCreditAppliedCents = 0;
      else reservedCreditWorkerId = workerId;
    }
    const depositIntent = depositCreditAppliedCents ? null : await stripeClient.paymentIntents.create({
      amount: 500,
      currency: "usd",
      capture_method: "manual",
      metadata: { jobId, applicationId: "temp", type: "DEPOSIT" },
    });
    pendingPaymentIntentId = depositIntent?.id || null;

    // Create application record
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        workerId,
        message,
        depositId: depositIntent?.id || null,
        depositStatus: depositCreditAppliedCents ? DepositStatus.AUTHORIZED : DepositStatus.PENDING,
        depositCreditAppliedCents,
        status: ApplicationStatus.APPLIED,
      },
    });
    createdApplicationId = application.id;
    reservedCreditWorkerId = null;

    if (!depositCreditAppliedCents) {
      await stripeClient.paymentIntents.update(depositIntent.id, { metadata: { applicationId: application.id, jobId, type: "DEPOSIT" } });
    } else {
      const applicationWithJob = await prisma.jobApplication.findUnique({ where: { id: application.id }, include: { job: { select: { title: true, hirerId: true } } } });
      await notifyApplication(applicationWithJob, "SUBMITTED", req.app.get("io"));
    }

    res.status(201).json({
      application,
      clientSecret: depositIntent?.client_secret || null,
      usedReferralCredit: Boolean(depositCreditAppliedCents),
    });
  } catch (error) {
    if (createdApplicationId) {
      try { await prisma.jobApplication.delete({ where: { id: createdApplicationId } }); } catch (cleanupError) { console.error("Application cleanup error:", cleanupError.message); }
    }
    if (pendingPaymentIntentId) {
      try { await stripeClient.paymentIntents.cancel(pendingPaymentIntentId); } catch (cleanupError) { console.error("Deposit cleanup error:", cleanupError.message); }
    }
    if (reservedCreditWorkerId) {
      try { await prisma.userProfile.update({ where: { userId: reservedCreditWorkerId }, data: { platformCreditCents: { increment: 500 } } }); } catch (cleanupError) { console.error("Application credit restore error:", cleanupError.message); }
    }
    console.error("Application Creation Error:", error.message);
    res.status(500).json({
      error: "application_creation_failed",
      message: "Failed to create job application",
      details: error.message,
    });
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
    if (application.depositCreditAppliedCents) return res.json({ application, authorized: true });
    if (!application.depositId) return res.status(400).json({ error: "deposit_not_found" });

    const intent = await stripeClient.paymentIntents.retrieve(application.depositId);
    if (intent.metadata?.applicationId !== application.id || intent.status !== "requires_capture") {
      return res.status(409).json({ error: "deposit_not_authorized", message: "The $5 deposit has not been authorized yet." });
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
      where: { workerId },
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
      where: { jobId },
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
  confirmApplicationDeposit,
  authorizeDepositFromIntent,
  getApplications,
  getJobApplications,
  acceptApplication,
  rejectApplication,

  withdrawApplication,
};
