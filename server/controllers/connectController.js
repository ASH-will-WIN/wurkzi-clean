const { prisma, stripeClient } = require("../db");

// Helper function to sync account status from Stripe
async function syncAccountStatus(accountId, userId) {
  try {
    const account = await stripeClient.accounts.retrieve(accountId);
    const requirements = account.requirements || {};

    const updated = await prisma.stripeAccount.update({
      where: { userId },
      data: {
        chargesEnabled: Boolean(account.charges_enabled),
        payoutsEnabled: Boolean(account.payouts_enabled),
        detailsSubmitted: Boolean(account.details_submitted),
        requiresAction:
          requirements.currently_due?.length > 0 ||
          requirements.eventually_due?.length > 0,
        currentDeadline: requirements.current_deadline
          ? new Date(requirements.current_deadline * 1000)
          : null,
        lastSyncAt: new Date(),
      },
    });

    return updated;
  } catch (error) {
    console.error("Failed to sync account status:", error);
    throw error;
  }
}

// Create Connect account and generate onboarding link
async function createAccount(req, res) {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({
        error: "missing_email",
        message: "User email is required for Stripe onboarding. Please ensure your profile has an email address.",
      });
    }

    // Check if account already exists
    let accountRecord = await prisma.stripeAccount.findUnique({
      where: { userId },
    });

    // If no record, create a new Express account in Stripe and store it
    if (!accountRecord) {
      const account = await stripeClient.accounts.create({
        type: "express",
        country: "US",
        email: userEmail,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      });

      accountRecord = await prisma.stripeAccount.create({
        data: {
          userId,
          accountId: account.id,
          chargesEnabled: Boolean(account.charges_enabled),
          payoutsEnabled: Boolean(account.payouts_enabled),
          detailsSubmitted: Boolean(account.details_submitted),
          requiresAction: false,
          lastSyncAt: new Date(),
        },
      });
    }

    // Generate fresh onboarding link
    // Fallback order: FRONTEND_URL -> CLIENT_URL -> default localhost
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000";

    // Stripe requires valid absolute URLs. If frontendUrl is missing, this would crash.
    const cleanFrontendUrl = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;

    const accountLink = await stripeClient.accountLinks.create({
      account: accountRecord.accountId,
      refresh_url: `${cleanFrontendUrl}/connect-refresh`,
      return_url: `${cleanFrontendUrl}/connect-return`,
      type: "account_onboarding",
    });

    res.json({
      accountId: accountRecord.accountId,
      onboardingUrl: accountLink.url,
      refreshUrl: `${cleanFrontendUrl}/connect-refresh`,
      returnUrl: `${cleanFrontendUrl}/connect-return`,
    });
  } catch (error) {
    console.error("Create Connect account error:", error);
    console.error("Error type:", error.type);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error raw:", error.raw);

    res.status(500).json({
      error: "connect_account_creation_failed",
      message: error.message || "Failed to create Connect account.",
      details: error.type || "StripeError",
      code: error.code,
      raw_message: error.raw?.message,
      statusCode: error.statusCode,
    });
  }
}

// Get current user's Connect account status
async function getStatus(req, res) {
  try {
    const userId = req.user.id;
    const record = await prisma.stripeAccount.findUnique({ where: { userId } });

    if (!record) {
      return res.json({
        exists: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requiresAction: false,
      });
    }

    // Sync fresh status from Stripe
    const updated = await syncAccountStatus(record.accountId, userId);

    // Generate action URL if onboarding is incomplete
    let actionUrl = null;
    if (!updated.detailsSubmitted || updated.requiresAction) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const accountLink = await stripeClient.accountLinks.create({
        account: record.accountId,
        refresh_url: `${frontendUrl}/connect-refresh`,
        return_url: `${frontendUrl}/connect-return`,
        type: "account_onboarding",
      });
      actionUrl = accountLink.url;
    }

    res.json({
      exists: true,
      accountId: updated.accountId,
      chargesEnabled: updated.chargesEnabled,
      payoutsEnabled: updated.payoutsEnabled,
      detailsSubmitted: updated.detailsSubmitted,
      requiresAction: updated.requiresAction,
      actionUrl,
    });
  } catch (error) {
    console.error("Get Connect status error:", error.message);
    res.status(500).json({
      error: "connect_status_failed",
      message: "Failed to get account status. Please try again.",
    });
  }
}

// Manually refresh account status from Stripe
async function refreshStatus(req, res) {
  try {
    const userId = req.user.id;
    const record = await prisma.stripeAccount.findUnique({ where: { userId } });

    if (!record) {
      return res.status(404).json({
        error: "account_not_found",
        message: "No Connect account found for this user.",
      });
    }

    // Get previous state for comparison
    const previousState = {
      chargesEnabled: record.chargesEnabled,
      payoutsEnabled: record.payoutsEnabled,
      detailsSubmitted: record.detailsSubmitted,
      requiresAction: record.requiresAction,
    };

    // Sync current status
    const updated = await syncAccountStatus(record.accountId, userId);

    // Determine what changed
    const changes = [];
    if (previousState.chargesEnabled !== updated.chargesEnabled) {
      changes.push(
        updated.chargesEnabled ? "charges_enabled" : "charges_disabled"
      );
    }
    if (previousState.payoutsEnabled !== updated.payoutsEnabled) {
      changes.push(
        updated.payoutsEnabled ? "payouts_enabled" : "payouts_disabled"
      );
    }
    if (previousState.detailsSubmitted !== updated.detailsSubmitted) {
      changes.push(
        updated.detailsSubmitted ? "details_completed" : "details_incomplete"
      );
    }
    if (previousState.requiresAction !== updated.requiresAction) {
      changes.push(
        updated.requiresAction ? "action_required" : "action_resolved"
      );
    }

    res.json({
      updated: true,
      status: {
        exists: true,
        accountId: updated.accountId,
        chargesEnabled: updated.chargesEnabled,
        payoutsEnabled: updated.payoutsEnabled,
        detailsSubmitted: updated.detailsSubmitted,
        requiresAction: updated.requiresAction,
      },
      changes: changes.length > 0 ? changes : undefined,
    });
  } catch (error) {
    console.error("Refresh Connect status error:", error.message);
    res.status(500).json({
      error: "connect_refresh_failed",
      message: "Failed to refresh account status. Please try again.",
    });
  }
}

module.exports = {
  createAccount,
  getStatus,
  refreshStatus,
  syncAccountStatus, // Export for use in webhooks
};
