const { prisma } = require("../db");

async function blockUser(req, res) {
  try {
    const blockedId = req.params.userId;
    if (!blockedId || blockedId === req.user.id) {
      return res.status(400).json({ error: "invalid_block", message: "Choose another Wurkzi member." });
    }
    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: req.user.id, blockedId } },
      create: { blockerId: req.user.id, blockedId },
      update: {},
    });
    req.app.get("io")?.to(req.user.id).to(blockedId).emit("conversation:blocked", { userId: req.user.id, blockedId });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Block user error:", error.message);
    res.status(500).json({ error: "block_failed", message: "Could not block this member." });
  }
}

async function unblockUser(req, res) {
  try {
    await prisma.userBlock.deleteMany({ where: { blockerId: req.user.id, blockedId: req.params.userId } });
    res.json({ ok: true });
  } catch (error) {
    console.error("Unblock user error:", error.message);
    res.status(500).json({ error: "unblock_failed", message: "Could not unblock this member." });
  }
}

module.exports = { blockUser, unblockUser };
