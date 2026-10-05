const express = require("express");
const auth = require("../middleware/auth");
const { getMyReferralSummary } = require("../controllers/referralController");

const router = express.Router();
router.get("/me", auth, getMyReferralSummary);
module.exports = router;
