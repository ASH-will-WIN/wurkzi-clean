const { prisma } = require("../db");

const WORKER_CREDIT_CENTS = 500;

async function awardReferralRewardsForJob(jobId) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { applications: { where: { status: "ACCEPTED" }, take: 1 } },
  });
  if (!job || job.status !== "COMPLETED" || !job.applications[0]) return;
  if (!(await prisma.payment.findFirst({ where: { jobId, status: "PAID" } }))) return;

  await awardWorkerReward(jobId, job.applications[0].workerId);
  await awardNeighborReward(jobId, job.hirerId);
}

async function isFirstPaidJob(field, jobId, userId) {
  const paidJobs = await prisma.payment.findMany({
    where: { [field]: userId, status: "PAID" },
    select: { jobId: true },
    orderBy: { createdAt: "asc" },
  });
  return paidJobs[0]?.jobId === jobId;
}

async function awardWorkerReward(jobId, workerId) {
  const referral = await prisma.referral.findUnique({ where: { referredId: workerId } });
  if (!referral || referral.workerRewardGrantedAt || !(await isFirstPaidJob("workerId", jobId, workerId))) return;

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.referral.updateMany({
      where: { id: referral.id, workerRewardGrantedAt: null },
      data: { workerRewardGrantedAt: new Date() },
    });
    if (!claimed.count) return;
    const recipients = [referral.referrerId, referral.referredId];
    await tx.userProfile.updateMany({ where: { userId: { in: recipients } }, data: { platformCreditCents: { increment: WORKER_CREDIT_CENTS } } });
    await tx.referralReward.createMany({
      data: recipients.map((recipientId) => ({ referralId: referral.id, recipientId, jobId, type: "WORKER_CREDIT", amountCents: WORKER_CREDIT_CENTS })),
      skipDuplicates: true,
    });
  });
}

async function awardNeighborReward(jobId, hirerId) {
  const referral = await prisma.referral.findUnique({ where: { referredId: hirerId } });
  if (!referral || referral.neighborRewardGrantedAt || !(await isFirstPaidJob("hirerId", jobId, hirerId))) return;

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.referral.updateMany({
      where: { id: referral.id, neighborRewardGrantedAt: null },
      data: { neighborRewardGrantedAt: new Date() },
    });
    if (!claimed.count) return;
    const recipients = [referral.referrerId, referral.referredId];
    await tx.userProfile.updateMany({ where: { userId: { in: recipients } }, data: { postingDiscountCount: { increment: 1 } } });
    await tx.referralReward.createMany({
      data: recipients.map((recipientId) => ({ referralId: referral.id, recipientId, jobId, type: "NEIGHBOR_POSTING_DISCOUNT", amountCents: 0 })),
      skipDuplicates: true,
    });
  });
}

module.exports = { awardReferralRewardsForJob };
