const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware, reportController.createReport);

module.exports = router;
