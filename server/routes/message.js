const express = require("express");
const auth = require("../middleware/auth");
const controller = require("../controllers/messageController");

const router = express.Router();
router.use(auth);

router.post("/conversations", controller.createConversation);
router.get("/conversations", controller.getConversations);
router.get("/conversations/:conversationId/messages", controller.getConversationMessages);
router.post("/conversations/:conversationId/messages", controller.sendMessage);
router.post("/conversations/:conversationId/read", controller.markConversationAsRead);
router.get("/unread-count", controller.getUnreadCount);

module.exports = router;
