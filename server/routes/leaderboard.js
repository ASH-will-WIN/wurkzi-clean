const express = require("express");
const auth = require("../middleware/auth");
const { getActiveLeaderboard, enroll, getMyLeaderboardStatus } = require("../controllers/leaderboardController");

const router = express.Router();
router.get("/active", getActiveLeaderboard);
router.post("/enroll", auth, enroll);
router.get("/me", auth, getMyLeaderboardStatus);

module.exports = router;
