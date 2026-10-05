const { prisma } = require("../db");

const STUDENT_JOB_POINTS = 5;
const NEIGHBOR_JOB_POINTS = 5;
const REFERRAL_POINTS = 10;

async function getActiveSeason(now = new Date()) {
  return prisma.leaderboardSeason.findFirst({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: "desc" },
  });
}

async function awardPointEvent({ seasonId, participant, action, points, sourceId, occurredAt }) {
  await prisma.$transaction(async (tx) => {
    const created = await tx.leaderboardPointEvent.createMany({
      data: { seasonId, participantId: participant.id, action, points, sourceId, occurredAt },
      skipDuplicates: true,
    });
    if (!created.count) return;

    const isReferral = action === "SUCCESSFUL_REFERRAL";
    await tx.leaderboardParticipant.update({
      where: { id: participant.id },
      data: {
        points: { increment: points },
        ...(isReferral ? { successfulReferralCount: { increment: 1 } } : { qualifyingJobCount: { increment: 1 } }),
        lastPointAt: occurredAt,
      },
    });
  });
}

async function awardLeaderboardPointsForJob(jobId, occurredAt = new Date()) {
  const season = await getActiveSeason(occurredAt);
  if (!season) return;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { applications: { where: { status: "ACCEPTED" }, take: 1 } },
  });
  if (!job || job.status !== "COMPLETED" || !job.applications[0]) return;
  if (!(await prisma.payment.findFirst({ where: { jobId, status: "PAID" } }))) return;

  const workerId = job.applications[0].workerId;
  await Promise.all([
    awardJobPoints(season, workerId, "STUDENT", "STUDENT_JOB_COMPLETED", STUDENT_JOB_POINTS, jobId, occurredAt),
    awardJobPoints(season, job.hirerId, "NEIGHBOR", "NEIGHBOR_JOB_COMPLETED", NEIGHBOR_JOB_POINTS, jobId, occurredAt),
    awardReferralPoints(season, workerId, jobId, occurredAt),
    awardReferralPoints(season, job.hirerId, jobId, occurredAt),
  ]);
}

async function awardJobPoints(season, userId, audience, action, points, jobId, occurredAt) {
  const participant = await prisma.leaderboardParticipant.findUnique({ where: { seasonId_userId: { seasonId: season.id, userId } } });
  if (!participant || participant.audience !== audience) return;
  await awardPointEvent({ seasonId: season.id, participant, action, points, sourceId: jobId, occurredAt });
}

async function awardReferralPoints(season, referredUserId, jobId, occurredAt) {
  const referral = await prisma.referral.findUnique({ where: { referredId: referredUserId } });
  if (!referral) return;

  const firstPaidPayment = await prisma.payment.findFirst({
    where: { status: "PAID", OR: [{ workerId: referredUserId }, { hirerId: referredUserId }] },
    orderBy: { updatedAt: "asc" },
    select: { jobId: true },
  });
  if (firstPaidPayment?.jobId !== jobId) return;

  const participant = await prisma.leaderboardParticipant.findUnique({
    where: { seasonId_userId: { seasonId: season.id, userId: referral.referrerId } },
  });
  if (!participant) return;
  await awardPointEvent({
    seasonId: season.id,
    participant,
    action: "SUCCESSFUL_REFERRAL",
    points: REFERRAL_POINTS,
    sourceId: referral.id,
    occurredAt,
  });
}

module.exports = { awardLeaderboardPointsForJob, getActiveSeason };
