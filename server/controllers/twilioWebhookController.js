const twilio = require("twilio");
const { prisma } = require("../db");
const { normalizePhoneNumber } = require("../services/smsService");

function isValidTwilioRequest(req) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl = process.env.PUBLIC_API_URL;
  if (!token || !baseUrl) return false;
  const url = `${baseUrl.replace(/\/$/, "")}${req.originalUrl}`;
  return twilio.validateRequest(token, req.get("x-twilio-signature") || "", url, req.body);
}

async function updateDeliveryStatus(req, res) {
  if (!isValidTwilioRequest(req)) return res.status(403).send("Invalid Twilio signature");
  const sid = req.body.MessageSid || req.body.SmsSid;
  const status = req.body.MessageStatus || req.body.SmsStatus;
  if (!sid || !status) return res.status(400).send("Missing message status");
  await prisma.smsDelivery.updateMany({
    where: { twilioMessageSid: sid },
    data: {
      status: String(status).toUpperCase(),
      lastError: req.body.ErrorCode ? `Twilio error ${String(req.body.ErrorCode).slice(0, 40)}` : null,
    },
  });
  res.sendStatus(204);
}

async function receiveMessage(req, res) {
  if (!isValidTwilioRequest(req)) return res.status(403).send("Invalid Twilio signature");
  const from = normalizePhoneNumber(req.body.From);
  const incomingKeyword = String(req.body.Body || "").trim().toUpperCase();
  const optOutType = String(req.body.OptOutType || incomingKeyword).trim().toUpperCase();
  if (!from) return res.sendStatus(204);
  const profiles = await prisma.userProfile.findMany({
    where: { phone: { not: null } },
    select: { userId: true, phone: true },
  });
  const matched = profiles.filter((profile) => normalizePhoneNumber(profile.phone) === from);
  if (!matched.length) return res.sendStatus(204);

  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(optOutType)) {
    await prisma.userProfile.updateMany({
      where: { userId: { in: matched.map((profile) => profile.userId) } },
      data: { smsNotificationsEnabled: false, smsOptedOutAt: new Date() },
    });
    await prisma.smsDelivery.updateMany({
      where: { status: "PENDING", notification: { recipientId: { in: matched.map((profile) => profile.userId) } } },
      data: { status: "CANCELLED" },
    });
  } else if (["START", "UNSTOP", "YES"].includes(optOutType)) {
    await prisma.userProfile.updateMany({
      where: { userId: { in: matched.map((profile) => profile.userId) } },
      data: { smsNotificationsEnabled: true, smsConsentAt: new Date(), smsOptedOutAt: null },
    });
  } else if (optOutType === "HELP") {
    // Twilio Messaging Services sends the configured HELP response.
  }
  res.sendStatus(204);
}

module.exports = { updateDeliveryStatus, receiveMessage };
