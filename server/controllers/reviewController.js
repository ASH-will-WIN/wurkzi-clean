const { prisma, JobStatus, ApplicationStatus } = require("../db");

async function getReviewsForJob(req, res) {
  try {
    const reviews = await prisma.review.findMany({
      where: { jobId: req.params.jobId },
      orderBy: { createdAt: "asc" },
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: "review_retrieval_failed", message: "Failed to retrieve reviews" });
  }
}

async function createReview(req, res) {
  try {
    const { rating, comment } = req.body;
    const ratingNumber = Number(rating);
    if (!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      return res.status(400).json({ error: "invalid_rating", message: "Rating must be a whole number from 1 to 5" });
    }
    if (comment && comment.trim().length > 1000) {
      return res.status(400).json({ error: "comment_too_long", message: "Review comments must be 1000 characters or fewer" });
    }

    const job = await prisma.job.findUnique({
      where: { id: req.params.jobId },
      include: { applications: { where: { status: ApplicationStatus.ACCEPTED }, take: 1 } },
    });
    if (!job) return res.status(404).json({ error: "job_not_found", message: "Job not found" });
    if (job.status !== JobStatus.COMPLETED) {
      return res.status(400).json({ error: "job_not_completed", message: "Reviews are available after the job is completed" });
    }

    const workerId = job.applications[0]?.workerId;
    const isHirer = req.user.id === job.hirerId;
    const isWorker = req.user.id === workerId;
    if (!isHirer && !isWorker) return res.status(403).json({ error: "not_authorized", message: "Only the poster and worker can review each other" });

    const revieweeId = isHirer ? workerId : job.hirerId;
    if (!revieweeId) return res.status(400).json({ error: "worker_not_found", message: "No accepted worker is linked to this job" });
    const review = await prisma.review.create({
      data: { jobId: job.id, reviewerId: req.user.id, revieweeId, rating: ratingNumber, comment: comment?.trim() || null },
    });
    res.status(201).json(review);
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "review_exists", message: "You have already reviewed this job" });
    console.error("Create Review Error:", error.message);
    res.status(500).json({ error: "review_creation_failed", message: "Failed to create review" });
  }
}

module.exports = { getReviewsForJob, createReview };
