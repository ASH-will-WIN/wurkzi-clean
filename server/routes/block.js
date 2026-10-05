const express = require("express");
const auth = require("../middleware/auth");
const { blockUser, unblockUser } = require("../controllers/blockController");

const router = express.Router();
router.use(auth);
router.post("/:userId", blockUser);
router.delete("/:userId", unblockUser);

module.exports = router;
