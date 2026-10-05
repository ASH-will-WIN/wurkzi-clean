const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth/authController");

// Routes
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

const authMiddleware = require("../middleware/auth");
router.delete("/delete", authMiddleware, authController.deleteAccount);

// Use message routes separately in index.js, this file is for auth.
// Wait, I should add this to message routes, which is likely in server/routes/message.js
// Let me check if message.js exists. Yes, I saw it in index.js: const messageRoutes = require("./routes/message");
// So I should edit server/routes/message.js NOT auth.js

module.exports = router;
