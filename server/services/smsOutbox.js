const { prisma } = require("../db");
const { createTwilioMessage, normalizePhoneNumber } = require("./smsService");

let workerTimer;
let batchRunning = false;

const MAX_RETRY_DELAY_MS = 3_600_000;

function formatSms(notification) {
  const origin = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://wurkzi.com").replace(/\/$/, "");
  const link = notification.href?.startsWith("/") ? `${origin}${notification.href}` : "";
  const parts = [notification.smsText || `${notification.title}: ${notification.body}`, link].filter(Boolean);
  return parts.join(" ").slice(0, 900);
}

async function dispatchOne(delivery) {
  const claimed = await prisma.smsDelivery.updateMany({
    where: { id: delivery.id, status: "PENDING", nextAttemptAt: { lte: new Date() } },
    data: { status: "SENDING", attemptCount: { increment: 1 } },
  });
  if (!claimed.count) return;

  const current = await prisma.smsDelivery.findUnique({
    where: { id: delivery.id },
    include: { notification: { include: { recipient: true } } },
  });
  if (!current?.notification) return;
  const { notification } = current;
  const profile = notification.recipient;
  if (!profile.smsNotificationsEnabled || !profile.smsConsentAt || profile.smsOptedOutAt) {
    await prisma.smsDelivery.update({ where: { id: current.id }, data: { status: "CANCELLED" } });
    return;
  }

  const phone = normalizePhoneNumber(profile.phone);
  if (!phone) {
    await prisma.smsDelivery.update({
      where: { id: current.id },
      data: { status: "FAILED", lastError: "Recipient phone number is invalid" },
    });
    return;
  }

  try {
    const statusCallback = process.env.PUBLIC_API_URL
      ? `${process.env.PUBLIC_API_URL.replace(/\/$/, "")}/api/webhooks/twilio/status`
      : undefined;
    const message = await createTwilioMessage(phone, formatSms(notification), statusCallback ? { statusCallback } : {});
    await prisma.smsDelivery.update({
      where: { id: current.id },
      data: { status: message.status || "QUEUED", twilioMessageSid: message.sid, lastError: null },
    });
  } catch (error) {
    const attempts = current.attemptCount;
    const permanentConfigurationError = /not configured|set TWILIO_|not in a supported format/i.test(error.message || "");
    const retryDelay = permanentConfigurationError
      ? null
      : Math.min(30_000 * (2 ** Math.min(attempts - 1, 8)), MAX_RETRY_DELAY_MS);
    await prisma.smsDelivery.update({
      where: { id: current.id },
      data: {
        status: retryDelay ? "PENDING" : "FAILED",
        nextAttemptAt: retryDelay ? new Date(Date.now() + retryDelay) : current.nextAttemptAt,
        lastError: String(error.message || "SMS delivery failed").slice(0, 500),
      },
    });
    console.error("SMS delivery failed:", error.message);
  }
}

async function dispatchPendingSms() {
  if (batchRunning) return;
  batchRunning = true;
  try {
    const now = new Date();
    // Recover rows left in SENDING by a process restart. Twilio's stable
    // message SID is persisted on success; database claiming avoids routine duplicates.
    await prisma.smsDelivery.updateMany({
      where: { status: "SENDING", updatedAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
      data: { status: "PENDING", nextAttemptAt: now },
    });
    const pending = await prisma.smsDelivery.findMany({
      where: { status: "PENDING", nextAttemptAt: { lte: now } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true },
    });
    for (const delivery of pending) await dispatchOne(delivery);
  } catch (error) {
    console.error("SMS outbox worker error:", error.message);
  } finally {
    batchRunning = false;
  }
}

function startSmsOutbox() {
  if (workerTimer) return;
  workerTimer = setInterval(dispatchPendingSms, 15_000);
  workerTimer.unref?.();
  dispatchPendingSms();
}

module.exports = { startSmsOutbox, dispatchPendingSms };
