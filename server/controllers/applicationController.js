const {
  prisma,
  JobStatus,
  ApplicationStatus,
  DepositStatus,
  supabase,
  stripeClient,
} = require("../db");

async function createApplication(req, res) {
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
      if (existingApplication.status === ApplicationStatus.WITHDRAWN) {
        // If they withdrew before, delete the old record so they can re-apply fresh
        await prisma.jobApplication.delete({
          where: { id: existingApplication.id },
        });
      } else {
        return res.status(400).json({
          error: "duplicate_application",
          message: "You have already applied for this job",
        });
      }
    }


    const profile = await prisma.userProfile.findUnique({ where: { userId: workerId } });
    const depositCreditAppliedCents = profile?.platformCreditCents >= 500 ? 500 : 0;
    const depositIntent = depositCreditAppliedCents ? null : await stripeClient.paymentIntents.create({
      amount: 500,
      currency: "usd",
      capture_method: "manual",
      metadata: { jobId, applicationId: "temp", type: "DEPOSIT" },
    });

    // Create application record
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        workerId,
        message,
        depositId: depositIntent?.id || null,
        depositStatus: DepositStatus.AUTHORIZED,
        depositCreditAppliedCents,
        status: ApplicationStatus.APPLIED,
      },
    });

    if (depositCreditAppliedCents) {
      await prisma.userProfile.update({ where: { userId: workerId }, data: { platformCreditCents: { decrement: depositCreditAppliedCents } } });
    } else {
      await stripeClient.paymentIntents.update(depositIntent.id, { metadata: { applicationId: application.id } });
    }

    res.status(201).json({
      application,
      clientSecret: depositIntent?.client_secret || null,
      usedReferralCredit: Boolean(depositCreditAppliedCents),
    });
  } catch (error) {
    console.error("Application Creation Error:", error.message);
    res.status(500).json({
      error: "application_creation_failed",
      message: "Failed to create job application",
      details: error.message,
    });
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

    if (application.status !== ApplicationStatus.APPLIED) {
      return res.status(400).json({
        error: "invalid_status",
        message: "Application is not in a state that can be accepted",
      });
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

    // Capture the $5 deposit
    try {
      if (application.depositId) await stripeClient.paymentIntents.capture(application.depositId);
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
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.status !== ApplicationStatus.APPLIED) {
      return res.status(400).json({
        error: "invalid_status",
        message: "Application is not in a state that can be rejected",
      });
    }

    // Cancel the deposit (refund the $5)
    if (application.depositId) await stripeClient.paymentIntents.cancel(application.depositId);
    if (application.depositCreditAppliedCents) {
      await prisma.userProfile.update({ where: { userId: application.workerId }, data: { platformCreditCents: { increment: application.depositCreditAppliedCents } } });
    }

    // Update application status
    const updatedApplication = await prisma.jobApplication.update({
      where: { id },
      data: {
        status: ApplicationStatus.REJECTED,
        depositStatus: DepositStatus.REFUNDED,
      },
    });

    res.json(updatedApplication);
  } catch (error) {
    console.error("Reject Application Error:", error.message);
    res.status(500).json({
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

    // Cancel the deposit (refund the $5)
    try {
      if (application.depositId) await stripeClient.paymentIntents.cancel(application.depositId);
    } catch (stripeError) {
      // If payment intent is already cancelled or captured, handle it
      console.error("Stripe Cancellation Error:", stripeError.message);
      // We still want to update the DB if it was already cancelled or refund it if possible
    }

    if (application.depositCreditAppliedCents) {
      await prisma.userProfile.update({ where: { userId: workerId }, data: { platformCreditCents: { increment: application.depositCreditAppliedCents } } });
    }

    // Update application status
    const updatedApplication = await prisma.jobApplication.update({
      where: { id },
      data: {
        status: ApplicationStatus.WITHDRAWN,
        depositStatus: DepositStatus.REFUNDED,
      },
    });

    res.json(updatedApplication);
  } catch (error) {
    console.error("Withdraw Application Error:", error.message);
    res.status(500).json({
      error: "application_withdrawal_failed",
      message: "Failed to withdraw application",
      details: error.message,
    });
  }
}

module.exports = {
  createApplication,
  getApplications,
  getJobApplications,
  acceptApplication,
  rejectApplication,

  withdrawApplication,
};

