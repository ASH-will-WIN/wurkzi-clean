const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");
const authMiddleware = require("../middleware/auth");

// Routes
router.post("/", authMiddleware, authMiddleware.requireVerifiedEmail, applicationController.createApplication);
router.get("/", authMiddleware, applicationController.getApplications);
router.get(
  "/jobs/:jobId",
  authMiddleware,
  applicationController.getJobApplications
);
router.patch(
  "/:id/accept",
  authMiddleware,
  authMiddleware.requireVerifiedEmail,
  applicationController.acceptApplication
);
router.patch(
  "/:id/reject",
  authMiddleware,
  authMiddleware.requireVerifiedEmail,
  applicationController.rejectApplication
);
router.patch("/:id/withdraw", authMiddleware, authMiddleware.requireVerifiedEmail, applicationController.withdrawApplication);
router.post("/:id/confirm-deposit", authMiddleware, authMiddleware.requireVerifiedEmail, applicationController.confirmApplicationDeposit);


module.exports = router;
