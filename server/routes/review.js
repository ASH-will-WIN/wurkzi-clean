const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const reviewController = require("../controllers/reviewController");

router.get("/job/:jobId", authMiddleware, reviewController.getReviewsForJob);
router.post("/job/:jobId", authMiddleware, reviewController.createReview);

module.exports = router;
