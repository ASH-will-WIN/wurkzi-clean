const { prisma } = require("../db");

/**
 * Persist an in-app notification and, when the recipient opted in, enqueue SMS.
 * sourceKey must identify one business event for one recipient.
 */
async function createNotification(input, io = null) {
  const {
    recipientId,
    sourceKey,
    type,
    title,
    body,
    href,
    smsText = null,
  } = input;

  if (!recipientId || !sourceKey || !type || !title || !body || !href) return null;

  const existing = await prisma.notification.findUnique({ where: { sourceKey } });
  if (existing) return existing;

  const profile = await prisma.userProfile.findUnique({
    where: { userId: recipientId },
    select: { smsNotificationsEnabled: true, smsConsentAt: true, smsOptedOutAt: true },
  });
  const shouldQueueSms = Boolean(
    profile?.smsNotificationsEnabled && profile.smsConsentAt && !profile.smsOptedOutAt && smsText
  );

  try {
    const notification = await prisma.notification.create({
      data: {
        recipientId,
        sourceKey,
        type,
        title,
        body,
        href,
        smsText,
        ...(shouldQueueSms ? { smsDelivery: { create: {} } } : {}),
      },
    });
    io?.to(recipientId).emit("notification:new", notification);
    return notification;
  } catch (error) {
    if (error.code === "P2002") {
      return prisma.notification.findUnique({ where: { sourceKey } });
    }
    throw error;
  }
}

module.exports = { createNotification };
