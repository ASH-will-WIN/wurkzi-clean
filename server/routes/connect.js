const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const connectController = require("../controllers/connectController");

// Create Connect account and get onboarding link
router.post("/account", authMiddleware, connectController.createAccount);

// Get current user's Connect account status
router.get("/status", authMiddleware, connectController.getStatus);

// Manually refresh account status from Stripe
router.post("/refresh", authMiddleware, connectController.refreshStatus);

module.exports = router;
