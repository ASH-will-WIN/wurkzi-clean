const { prisma, stripeClient } = require("../db");
const { syncAccountStatus } = require("./connectController");

// Handle Stripe webhook events
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripeClient.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  try {
    // Handle the event
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      case 'account.application.authorized':
        await handleAccountUpdated(event.data.object);
        break;
      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object);
        break;
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handle account.updated events
async function handleAccountUpdated(account) {
  try {
    // Find the user account in our database
    const stripeAccount = await prisma.stripeAccount.findUnique({
      where: { accountId: account.id }
    });

    if (!stripeAccount) {
      console.log(`No local account found for Stripe account: ${account.id}`);
      return;
    }

    console.log(`Updating account status for user: ${stripeAccount.userId}`);
    
    // Sync the latest status
    await syncAccountStatus(account.id, stripeAccount.userId);
    
    console.log(`Account status updated successfully for: ${account.id}`);
  } catch (error) {
    console.error('Error handling account.updated:', error);
    throw error;
  }
}

// Handle account deauthorization
async function handleAccountDeauthorized(account) {
  try {
    // Find and delete the account record
    const deleted = await prisma.stripeAccount.deleteMany({
      where: { accountId: account.id }
    });

    if (deleted.count > 0) {
      console.log(`Deauthorized and deleted account: ${account.id}`);
    } else {
      console.log(`No local account found to delete: ${account.id}`);
    }
  } catch (error) {
    console.error('Error handling account deauthorization:', error);
    throw error;
  }
}

// Handle capability updates
async function handleCapabilityUpdated(capability) {
  try {
    // Find the account this capability belongs to
    const stripeAccount = await prisma.stripeAccount.findUnique({
      where: { accountId: capability.account }
    });

    if (!stripeAccount) {
      console.log(`No local account found for capability update: ${capability.account}`);
      return;
    }

    console.log(`Capability updated for account: ${capability.account}, capability: ${capability.id}, status: ${capability.status}`);
    
    // Sync the latest status to get updated capabilities
    await syncAccountStatus(capability.account, stripeAccount.userId);
    
  } catch (error) {
    console.error('Error handling capability.updated:', error);
    throw error;
  }
}

module.exports = {
  handleStripeWebhook,
};