const {
  prisma,
  JobStatus,
  ApplicationStatus,
  DepositStatus,
  supabase,
} = require("../db");
const { createNotification } = require("../services/notificationService");

async function createJob(req, res) {
  try {
    const {
      title,
      initialDescription,
      fullDescription,
      address,
      generalLocation,
      city,
      state,
      price,
      hirerId,
      estimatedTime,
      providesResources,
      requiredResources,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !initialDescription ||
      !fullDescription ||
      !address ||
      !city ||
      !state ||
      !hirerId ||
      price === undefined ||
      price === null
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (typeof providesResources !== "boolean") {
      return res.status(400).json({
        error: "missing_resource_preference",
        message: "Please indicate whether you will provide the resources.",
      });
    }

    if (!providesResources && !requiredResources?.trim()) {
      return res.status(400).json({
        error: "missing_required_resources",
        message: "Please list the resources the worker will need to bring.",
      });
    }

    // Validate price must be a positive number and at least 25
    if (isNaN(price) || Number(price) < 25) {
      return res.status(400).json({
        error: "invalid_price",
        message: "Price must be at least $25.00",
      });
    }

    // Validate estimatedTime if provided
    if (
      estimatedTime !== undefined &&
      (isNaN(estimatedTime) || Number(estimatedTime) < 0)
    ) {
      return res.status(400).json({
        error: "invalid_estimated_time",
        message: "Estimated time must be a valid positive number.",
      });
    }

    const job = await prisma.job.create({
      data: {
        title,
        address,
        generalLocation,
        city,
        state,
        initialDescription,
        fullDescription,
        hirerId, // Directly use the provided Supabase UID
        price,
        estimatedTime: estimatedTime ? Number(estimatedTime) : null,
        providesResources,
        requiredResources: providesResources ? null : requiredResources.trim(),
        status: JobStatus.PENDING,
      },
    });

    res.json(job);
  } catch (error) {
    console.error("Job Creation Error:", error.message);
    res.status(500).json({
      error: "job_creation_failed",
      message: error.message,
    });
  }
}

async function getJobs(req, res) {
  try {
    // Check if user is a worker and verify Stripe onboarding status
    // Unified Role: Removed strict WORKER onboarding check for viewing jobs.
    // Users can view jobs freely; onboarding is only prompted when they want payouts (Dashboard).

    const jobs = await prisma.job.findMany({
      select: {
        id: true,
        title: true,
        initialDescription: true,
        fullDescription: true,
        address: true,
        generalLocation: true,
        city: true,
        state: true,
        status: true,
        price: true,
        providesResources: true,
        requiredResources: true,
        createdAt: true,
        estimatedTime: true,
        jobImages: {
          where: { isPublic: true },
          take: 1,
          select: {
            id: true,
            // url: true, // REMOVED FOR LAZY LOADING OPTIMIZATION
            caption: true,
            isPublic: true,
          },
        },
      },
      where: {
        status: {
          in: [JobStatus.PENDING], // Only show jobs that are accepting applications
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(jobs);
  } catch (error) {
    console.error("Job List Error:", {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "job_list_retrieval_failed",
      message: "Failed to retrieve job listings",
      details: error.message,
      requestId: req.headers["x-request-id"],
    });
  }
}

async function getJob(req, res) {
  try {
    const { id } = req.params;

    // Get job with basic info
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        jobImages: true,
        applications: {
          where: {
            workerId: req.user?.id,
            OR: [
              { status: { not: ApplicationStatus.APPLIED } },
              { depositStatus: { in: [DepositStatus.AUTHORIZED, DepositStatus.CAPTURED] } },
            ],
          },
        },
      },
    });

    // If user is hirer or has accepted application, return full job details
    if (
      req.user?.id === job.hirerId ||
      job.applications.some((application) => application.status !== ApplicationStatus.PENDING_PAYMENT)
    ) {
      res.json(job);
      return;
    }

    // Otherwise return job without sensitive info
    const { address, jobImages: images, ...jobWithoutSensitive } = job;
    res.json({
      ...jobWithoutSensitive,
      address: "Restricted - Application must be accepted to view",
      images: [],
    });
  } catch (error) {
    console.error("Job Get Error Detail:", {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      jobId: req.params.id,
    });
    res.status(500).json({
      error: "job_retrieval_failed",
      message: "Failed to retrieve job details",
      details: error.message,
      requestId: req.headers["x-request-id"],
    });
  }
}

async function updateJob(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const job = await prisma.job.update({
      where: { id },
      data: {
        status,
      },
    });
    res.json(job);
  } catch (error) {
    console.error("Job Update Error:", {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      jobId: req.params.id,
      updateData: req.body,
    });
    res.status(500).json({
      error: "job_update_failed",
      message: "Failed to update job status",
      details: error.message,
      requestId: req.headers["x-request-id"],
    });
  }
}

async function releaseOrRefundApplicationDeposit(application, jobId) {
  if (!application.depositId) return;

  const { stripeClient } = require("../db");
  const intent = await stripeClient.paymentIntents.retrieve(application.depositId);
  if (intent.status === "canceled") return;

  if (intent.status === "succeeded") {
    const chargeId = typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id;
    if (!chargeId) throw new Error("The captured deposit has no associated Stripe charge.");

    const charge = await stripeClient.charges.retrieve(chargeId);
    const remainingAmount = Math.max(0, charge.amount - charge.amount_refunded);
    if (remainingAmount > 0) {
      await stripeClient.refunds.create(
        { charge: chargeId, amount: remainingAmount },
        { idempotencyKey: `job-delete-${jobId}-${application.id}` }
      );
    }
    return;
  }

  // Retrieving first makes retries safe when an earlier delete attempt already
  // canceled this authorization before failing during database cleanup.
  await stripeClient.paymentIntents.cancel(intent.id);
}

async function deleteJob(req, res) {
  try {
    const { id } = req.params;
    const hirerId = req.user.id;

    // 1. Fetch job to check status and ownership before contacting Stripe.
    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // 2. Security Check: Only the hirer can delete their job
    if (job.hirerId !== hirerId) {
      return res.status(403).json({
        error: "not_authorized",
        message: "You can only delete jobs that you created.",
      });
    }

    // 3. Status Check: Only PENDING jobs can be deleted
    // (If a job is COMMITTED, IN_PROGRESS, or COMPLETED, it shouldn't be deleted)
    if (job.status !== JobStatus.PENDING) {
      return res.status(400).json({
        error: "invalid_status",
        message: `Cannot delete a job that is already in ${job.status} status.`,
      });
    }

    // Delete conversations before the job; messages are related to a
    // conversation, not directly to a job, and cascade with that conversation.
    // Keep the job row locked until deposits and related rows are resolved so
    // application and acceptance requests cannot race this deletion.
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "jobs" WHERE "id" = ${id} FOR UPDATE`;
      const currentJob = await tx.job.findUnique({ where: { id }, select: { hirerId: true, status: true } });
      if (!currentJob) {
        const error = new Error("Job not found");
        error.status = 404;
        throw error;
      }
      if (currentJob.hirerId !== hirerId) {
        const error = new Error("You can only delete jobs that you created.");
        error.status = 403;
        throw error;
      }
      if (currentJob.status !== JobStatus.PENDING) {
        const error = new Error(`Cannot delete a job that is already in ${currentJob.status} status.`);
        error.status = 409;
        throw error;
      }

      await tx.$queryRaw`SELECT "id" FROM "job_applications" WHERE "jobId" = ${id} FOR UPDATE`;

      // Payments are financial records and have a restrictive relation to jobs.
      // A pending job should not have any; fail clearly instead of deleting
      // transaction history or returning a foreign-key error.
      const currentPayment = await tx.payment.findFirst({ where: { jobId: id }, select: { id: true } });
      const currentIncentive = await tx.jobIncentive.findUnique({ where: { jobId: id }, select: { id: true } });
      if (currentPayment || currentIncentive) {
        const error = new Error("This job has payment activity and cannot be deleted until it is resolved.");
        error.status = 409;
        throw error;
      }

      const applications = await tx.jobApplication.findMany({
        where: { jobId: id },
        select: { id: true, workerId: true, depositId: true, depositCreditAppliedCents: true, depositStatus: true },
      });

      // Release pending authorizations or refund a captured deposit. Abort the
      // deletion if Stripe cannot resolve every deposit. The Stripe helper is
      // retry-safe if an earlier attempt completed Stripe work but rolled back.
      const depositResults = await Promise.allSettled(
        applications.map((application) => releaseOrRefundApplicationDeposit(application, id))
      );
      const depositErrors = depositResults.filter((result) => result.status === "rejected");
      if (depositErrors.length) {
        depositErrors.forEach((result) => console.error("Failed to resolve application deposit before job deletion:", result.reason?.message));
        const error = new Error("The job was not deleted because a worker deposit could not be released or refunded. Please retry.");
        error.status = 502;
        throw error;
      }

      for (const application of applications) {
        if (application.depositCreditAppliedCents > 0 && application.depositStatus !== DepositStatus.REFUNDED) {
          await tx.userProfile.updateMany({
            where: { userId: application.workerId },
            data: { platformCreditCents: { increment: application.depositCreditAppliedCents } },
          });
        }
      }

      await tx.conversation.deleteMany({ where: { jobId: id } });
      await tx.jobApplication.deleteMany({ where: { jobId: id } });
      await tx.jobImage.deleteMany({ where: { jobId: id } });
      await tx.job.delete({ where: { id } });
    }, { maxWait: 10000, timeout: 60000 });

    res.json({
      message: "Job deleted successfully. Worker deposit authorizations were released and captured deposits refunded.",
    });
  } catch (error) {
    console.error("Job Deletion Error:", error.message);
    const status = error.status || 500;
    res.status(status).json({
      error: "job_deletion_failed",
      message: status < 500 || status === 502 ? error.message : "Failed to delete job.",
      ...(status >= 500 ? { details: error.message } : {}),
    });
  }
}

async function acceptJob(req, res) {
  try {
    const { jobId } = req.params;
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMMITTED, // Changed from IN_PROGRESS
      },
    });
    res.json(job);
  } catch (error) {
    console.error("Job Accept Error:", {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      jobId: req.params.jobId,
      updateData: { status: "IN_PROGRESS" },
    });
    res.status(500).json({
      error: "job_accept_failed",
      message: "Failed to accept job",
      details: error.message,
      requestId: req.headers["x-request-id"],
    });
  }
}

async function addJobImage(req, res) {
  try {
    const { id } = req.params;
    const { url, isPublic, caption } = req.body;

    // Verify the job exists and the user is the hirer
    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.hirerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to add images to this job" });
    }

    const jobImage = await prisma.jobImage.create({
      data: {
        url: url.trim(),
        isPublic,
        caption,
        jobId: id,
      },
    });

    res.status(201).json(jobImage);
  } catch (error) {
    console.error("Add Job Image Error:", error.message);
    res.status(500).json({
      error: "job_image_creation_failed",
      message: "Failed to add job image",
      details: error.message,
    });
  }
}

async function getJobImages(req, res) {
  try {
    const { id } = req.params;

    // Get the job to check if it exists
    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check authentication
    let canViewAllImages = false;

    if (req.user) {
      // Check if user is hirer
      if (job.hirerId === req.user.id) {
        canViewAllImages = true;
      } else {
        // Check if user is a worker with an application
        const application = await prisma.jobApplication.findFirst({
          where: {
            jobId: id,
            workerId: req.user.id,
            status: { not: ApplicationStatus.PENDING_PAYMENT },
            depositStatus: { in: [DepositStatus.AUTHORIZED, DepositStatus.CAPTURED] },
          },
        });
        canViewAllImages = !!application;
      }
    }

    // Get images based on access level
    const images = canViewAllImages
      ? await prisma.jobImage.findMany({ where: { jobId: id } })
      : await prisma.jobImage.findMany({
        where: {
          jobId: id,
          isPublic: true,
        },
      });

    res.json(images);
  } catch (error) {
    console.error("Get Job Images Error Details:", {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      jobId: req.params.id,
    });
    res.status(500).json({
      error: "job_images_retrieval_failed",
      message: "Failed to retrieve job images",
      details: error.message,
    });
  }
}

async function deleteJobImage(req, res) {
  try {
    const { imageId } = req.params;

    // Get the image to check ownership
    const jobImage = await prisma.jobImage.findUnique({
      where: { id: imageId },
      include: { job: true },
    });

    if (!jobImage) {
      return res.status(404).json({ error: "Image not found" });
    }

    if (jobImage.job.hirerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this image" });
    }

    await prisma.jobImage.delete({
      where: { id: imageId },
    });

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Delete Job Image Error:", error.message);
    res.status(500).json({
      error: "job_image_deletion_failed",
      message: "Failed to delete job image",
      details: error.message,
    });
  }
}

async function startJob(req, res) {
  try {
    const { jobId } = req.params;

    // Get the job and verify it's in COMMITTED status
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
          take: 1,
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status !== JobStatus.COMMITTED) {
      return res.status(400).json({
        error: "invalid_status",
        message: "Job must be in COMMITTED status to start work",
      });
    }

    if (job.applications.length === 0) {
      return res.status(400).json({
        error: "no_accepted_application",
        message: "No accepted application found for this job",
      });
    }

    if (job.applications[0].workerId !== req.user.id) {
      return res.status(403).json({
        error: "not_authorized_worker",
        message: "Only the accepted worker can start this job",
      });
    }

    // Update job status to IN_PROGRESS
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.IN_PROGRESS },
    });

    res.json(updatedJob);
  } catch (error) {
    console.error("Start Job Error:", error.message);
    res.status(500).json({
      error: "job_start_failed",
      message: "Failed to start job",
      details: error.message,
    });
  }
}

async function completeJob(req, res) {
  try {
    const { jobId } = req.params;

    // Get the job and verify it's in IN_PROGRESS status
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
          take: 1,
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status !== JobStatus.IN_PROGRESS) {
      return res.status(400).json({
        error: "invalid_status",
        message: "Job must be in IN_PROGRESS status to be completed",
      });
    }

    if (job.applications.length === 0) {
      return res.status(400).json({
        error: "no_accepted_application",
        message: "No accepted application found for this job",
      });
    }

    if (job.applications[0].workerId !== req.user.id) {
      return res.status(403).json({
        error: "not_authorized_worker",
        message: "Only the accepted worker can complete this job",
      });
    }

    // Update job status to COMPLETED
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED },
    });

    const workerId = job.applications[0].workerId;
    const body = `${job.title} was marked complete.`;
    await Promise.all([job.hirerId, workerId].map((recipientId) =>
      createNotification({
        recipientId,
        sourceKey: `job_completed:${jobId}:${recipientId}`,
        type: "JOB_COMPLETED",
        title: "Job completed",
        body,
        smsText: body,
        href: `/jobs/${jobId}`,
      }, req.app.get("io")).catch((error) => console.error("Job completion notification failed:", error.message))
    ));
    req.app.get("io")?.to(workerId).to(job.hirerId).emit("job:status", { jobId, status: "COMPLETED" });

    res.json(updatedJob);
  } catch (error) {
    console.error("Complete Job Error:", error.message);
    res.status(500).json({
      error: "job_completion_failed",
      message: "Failed to complete job",
      details: error.message,
    });
  }
}

async function getJobsByHirer(req, res) {
  try {
    const jobs = await prisma.job.findMany({
      where: { hirerId: req.user.id },
      include: {
        applications: {
          where: {
            NOT: {
              OR: [
                { status: ApplicationStatus.PENDING_PAYMENT },
                { status: ApplicationStatus.APPLIED, depositStatus: DepositStatus.PENDING },
              ],
            },
          },
          include: {
            // job: true, // REMOVED: Redundant and potentially heavy
            // If we need worker details (which we do for the dashboard to show who applied)
            // We should relying on the 'workerId' which is on the application
            // But we might need the worker's name/profile?
            // The schema says workerId is a String (Supabase ID).
            // We don't have a specific relation to a "User" model for worker details in the prisma schema shown?
            // Wait, schema has UserProfile but no User model relation on JobApplication.
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(jobs);
  } catch (error) {
    console.error("Get Jobs By Hirer Error:", error.message);
    res.status(500).json({
      error: "hirer_jobs_retrieval_failed",
      message: "Failed to retrieve hirer jobs",
      details: error.message,
    });
  }
}

module.exports = {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  acceptJob,
  addJobImage,
  getJobImages,
  deleteJobImage,
  startJob,
  completeJob,
  getJobsByHirer,
};
