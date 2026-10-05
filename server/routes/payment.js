const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/auth"); // ADD THIS LINE

// Get a list of payments
router.get("/", authMiddleware, paymentController.getPayments); // ADD MIDDLEWARE

// Get my payments (for dashboard)
router.get("/my-payments", authMiddleware, paymentController.getMyPayments);

// Get total worker earnings
router.get("/earnings", authMiddleware, paymentController.getWorkerEarnings);

router.get("/:id", authMiddleware, paymentController.getPayment); // ADD MIDDLEWARE
// New final payment routes
router.post("/final", authMiddleware, authMiddleware.requireVerifiedEmail, paymentController.createFinalPayment);
router.patch(
  "/:paymentId/confirm",
  authMiddleware,
  authMiddleware.requireVerifiedEmail,
  paymentController.confirmFinalPayment
);

router.post("/cash", authMiddleware, authMiddleware.requireVerifiedEmail, paymentController.markJobPaidInCash);

module.exports = router;
