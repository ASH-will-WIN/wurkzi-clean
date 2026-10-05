const express = require("express");
const authMiddleware = require("../middleware/auth");
const controller = require("../controllers/notificationController");

const router = express.Router();
router.use(authMiddleware);
router.get("/", controller.listNotifications);
router.patch("/:id/read", controller.markNotificationRead);
router.post("/read-all", controller.markAllNotificationsRead);
router.get("/preferences", controller.getPreferences);
router.patch("/preferences", controller.updatePreferences);

module.exports = router;
