const { prisma } = require("../db");

async function getMyReferralSummary(req, res) {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: "profile_not_found" });
    const [referrals, rewards] = await Promise.all([
      prisma.referral.findMany({ where: { referrerId: req.user.id }, orderBy: { createdAt: "desc" } }),
      prisma.referralReward.findMany({ where: { recipientId: req.user.id }, orderBy: { createdAt: "desc" } }),
    ]);
    res.json({
      referralCode: profile.referralCode,
      platformCreditCents: profile.platformCreditCents,
      postingDiscountCount: profile.postingDiscountCount,
      referralCount: referrals.length,
      workerRewardsEarned: rewards.filter((reward) => reward.type === "WORKER_CREDIT").length,
      neighborDiscountsEarned: rewards.filter((reward) => reward.type === "NEIGHBOR_POSTING_DISCOUNT").length,
      referrals: referrals.map((referral) => ({ id: referral.id, createdAt: referral.createdAt, workerRewardGranted: Boolean(referral.workerRewardGrantedAt), neighborRewardGranted: Boolean(referral.neighborRewardGrantedAt) })),
    });
  } catch (error) {
    console.error("Get Referral Summary Error:", error.message);
    res.status(500).json({ error: "referral_summary_failed" });
  }
}

module.exports = { getMyReferralSummary };
