const { prisma } = require("../db");

async function listNotifications(req, res) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.notification.count({ where: { recipientId: req.user.id, readAt: null } }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notification list error:", error.message);
    res.status(500).json({ error: "notification_list_failed" });
  }
}

async function markNotificationRead(req, res) {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, recipientId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      const notification = await prisma.notification.findFirst({
        where: { id: req.params.id, recipientId: req.user.id },
      });
      if (!notification) return res.status(404).json({ error: "notification_not_found" });
      return res.json(notification);
    }
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    res.json(notification);
  } catch (error) {
    console.error("Mark notification read error:", error.message);
    res.status(500).json({ error: "notification_read_failed" });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error.message);
    res.status(500).json({ error: "notifications_read_failed" });
  }
}

async function getPreferences(req, res) {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id },
      select: { smsNotificationsEnabled: true, smsOptedOutAt: true },
    });
    if (!profile) return res.status(404).json({ error: "profile_not_found" });
    res.json({
      smsNotificationsEnabled: profile.smsNotificationsEnabled,
      smsOptedOut: Boolean(profile.smsOptedOutAt),
    });
  } catch (error) {
    console.error("Notification preferences read error:", error.message);
    res.status(500).json({ error: "notification_preferences_failed" });
  }
}

async function updatePreferences(req, res) {
  try {
    const enabled = req.body.smsNotificationsEnabled;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "invalid_sms_preference" });
    }
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id },
      select: { smsOptedOutAt: true },
    });
    if (!profile) return res.status(404).json({ error: "profile_not_found" });
    if (enabled && profile.smsOptedOutAt) {
      return res.status(409).json({
        error: "sms_keyword_opt_out",
        message: "Reply START to a Wurkzi text to turn SMS alerts back on.",
      });
    }

    const updated = await prisma.userProfile.update({
      where: { userId: req.user.id },
      data: {
        smsNotificationsEnabled: enabled,
        ...(enabled ? { smsConsentAt: new Date() } : {}),
      },
      select: { smsNotificationsEnabled: true, smsOptedOutAt: true },
    });
    if (!enabled) {
      await prisma.smsDelivery.updateMany({
        where: { status: "PENDING", notification: { recipientId: req.user.id } },
        data: { status: "CANCELLED" },
      });
    }
    res.json({ smsNotificationsEnabled: updated.smsNotificationsEnabled, smsOptedOut: Boolean(updated.smsOptedOutAt) });
  } catch (error) {
    console.error("Notification preferences update error:", error.message);
    res.status(500).json({ error: "notification_preferences_update_failed" });
  }
}

module.exports = { listNotifications, markNotificationRead, markAllNotificationsRead, getPreferences, updatePreferences };
