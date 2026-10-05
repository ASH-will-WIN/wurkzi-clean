const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Raw body parser for Stripe webhooks (needed for signature verification)
router.use('/stripe', express.raw({ type: 'application/json' }));

// Stripe webhook endpoint
router.post('/stripe', webhookController.handleStripeWebhook);

module.exports = router;