const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/auth"); // ADD THIS LINE

// Create a new payment
router.post("/", authMiddleware, paymentController.createPayment); // ADD MIDDLEWARE

// Get a list of payments
router.get("/", authMiddleware, paymentController.getPayments); // ADD MIDDLEWARE

// Get my payments (for dashboard)
router.get("/my-payments", authMiddleware, paymentController.getMyPayments);

// Get total worker earnings
router.get("/earnings", authMiddleware, paymentController.getWorkerEarnings);

router.get("/:id", authMiddleware, paymentController.getPayment); // ADD MIDDLEWARE
router.patch("/:id", authMiddleware, paymentController.updatePayment); // ADD MIDDLEWARE
router.delete("/:id", authMiddleware, paymentController.deletePayment); // ADD MIDDLEWARE

// New final payment routes
router.post("/final", authMiddleware, paymentController.createFinalPayment);
router.patch(
  "/:paymentId/confirm",
  authMiddleware,
  paymentController.confirmFinalPayment
);

router.post("/cash", authMiddleware, paymentController.markJobPaidInCash);

module.exports = router;
