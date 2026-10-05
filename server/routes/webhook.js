const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
const twilioWebhookController = require("../controllers/twilioWebhookController");

// Raw body parser for Stripe webhooks (needed for signature verification)
router.use('/stripe', express.raw({ type: 'application/json' }));

// Stripe webhook endpoint
router.post('/stripe', webhookController.handleStripeWebhook);

// Twilio posts form-encoded webhooks; verify each request in the controller.
router.post('/twilio/status', express.urlencoded({ extended: false }), twilioWebhookController.updateDeliveryStatus);
router.post('/twilio/inbound', express.urlencoded({ extended: false }), twilioWebhookController.receiveMessage);

module.exports = router;
