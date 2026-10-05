const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, jobController.createJob); // ADD MIDDLEWARE
router.get("/", authMiddleware, jobController.getJobs); // ADD MIDDLEWARE
router.get("/:id", authMiddleware, jobController.getJob); // ADD MIDDLEWARE
router.patch("/:id", authMiddleware, jobController.updateJob); // ADD THIS LINE
router.delete("/:id", authMiddleware, jobController.deleteJob); // ADD DELETE ROUTE
router.patch("/accept/:jobId", authMiddleware, jobController.acceptJob); // ADD MIDDLEWARE

// New job workflow routes
router.patch("/:jobId/start", authMiddleware, jobController.startJob);
router.patch("/:jobId/complete", authMiddleware, jobController.completeJob);
router.get("/hirer/my-jobs", authMiddleware, jobController.getJobsByHirer);

router.post("/:id/images", authMiddleware, jobController.addJobImage); // ADD MIDDLEWARE
router.get("/:id/images", authMiddleware, jobController.getJobImages); // ADD MIDDLEWARE
router.delete("/images/:imageId", authMiddleware, jobController.deleteJobImage); // ADD MIDDLEWARE

module.exports = router;
