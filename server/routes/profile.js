const express = require("express");
const authMiddleware = require("../middleware/auth");
const profileController = require("../controllers/profileController");

const router = express.Router();
router.use(authMiddleware);

router.get("/me", profileController.getMyProfile);
router.patch("/me", profileController.updateMyProfile);
router.put("/me/avatar", profileController.uploadAvatar);
router.delete("/me/avatar", profileController.deleteAvatar);

module.exports = router;
