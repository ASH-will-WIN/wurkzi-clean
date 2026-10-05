const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");
const authMiddleware = require("../middleware/auth");

// Routes
router.post("/", authMiddleware, applicationController.createApplication);
router.get("/", authMiddleware, applicationController.getApplications);
router.get(
  "/jobs/:jobId",
  authMiddleware,
  applicationController.getJobApplications
);
router.patch(
  "/:id/accept",
  authMiddleware,
  applicationController.acceptApplication
);
router.patch(
  "/:id/reject",
  authMiddleware,
  applicationController.rejectApplication
);
router.patch("/:id/withdraw", authMiddleware, applicationController.withdrawApplication);


module.exports = router;
