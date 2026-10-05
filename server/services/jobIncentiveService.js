const { prisma, stripeClient } = require("../db");

const QUALIFYING_JOBS = 5;
const PAYOUT_CENTS = 175;
const HIRER_CREDIT_CENTS = 325;

async function reserveJobIncentive(jobId, attempt = 0) {
  try {
    return await prisma.$transaction(async (tx) => {
    const existing = await tx.jobIncentive.findUnique({ where: { jobId } });
    if (existing) return existing;

    const job = await tx.job.findUnique({
      where: { id: jobId },
      include: {
        applications: { where: { status: "ACCEPTED" }, take: 1 },
        payments: { where: { status: "PAID" }, take: 1, orderBy: { createdAt: "asc" } },
      },
    });
    if (!job || job.status !== "COMPLETED" || !job.applications[0] || !job.payments[0]) return null;

    const workerId = job.applications[0].workerId;
    // Serialize ordinal assignment per worker so concurrent payment events
    // cannot reserve the same qualifying-job number.
    await tx.$queryRaw`SELECT "user_id" FROM "user_profiles" WHERE "user_id" = ${workerId} FOR UPDATE`;

    const paidRows = await tx.payment.findMany({
      where: { workerId, status: "PAID", job: { status: "COMPLETED" } },
      select: { jobId: true, createdAt: true, paidAt: true },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }, { jobId: "asc" }],
    });
    const earliestByJob = new Map();
    for (const payment of paidRows) {
      const previous = earliestByJob.get(payment.jobId);
      const qualifyingAt = payment.paidAt || payment.createdAt;
      if (!previous || qualifyingAt < previous) earliestByJob.set(payment.jobId, qualifyingAt);
    }
    const orderedJobs = [...earliestByJob.entries()]
      .sort((a, b) => a[1].getTime() - b[1].getTime() || a[0].localeCompare(b[0]))
      .map(([paidJobId]) => paidJobId);
    const workerJobNumber = orderedJobs.indexOf(jobId) + 1;
    if (workerJobNumber < 1 || workerJobNumber > QUALIFYING_JOBS) return null;

    return tx.jobIncentive.create({
      data: {
        jobId,
        workerId,
        hirerId: job.hirerId,
        workerJobNumber,
        workerPayoutCents: PAYOUT_CENTS,
        hirerCreditCents: HIRER_CREDIT_CENTS,
      },
    });
    });
  } catch (error) {
    if (error.code === "P2002") {
      const byJob = await prisma.jobIncentive.findUnique({ where: { jobId } });
      if (byJob || attempt >= 1) return byJob;
      // Recalculate after the conflicting worker transaction has committed.
      return reserveJobIncentive(jobId, attempt + 1);
    }
    throw error;
  }
}

async function processJobIncentive(jobId) {
  const incentive = await reserveJobIncentive(jobId);
  if (!incentive || incentive.payoutStatus === "PAID") return incentive;

  try {
    const [application, stripeAccount] = await Promise.all([
      prisma.jobApplication.findFirst({
        where: { jobId, workerId: incentive.workerId, status: "ACCEPTED" },
        select: { depositId: true },
      }),
      prisma.stripeAccount.findUnique({ where: { userId: incentive.workerId } }),
    ]);
    if (!stripeAccount) throw new Error("Worker has not connected a payout account");
    const account = await stripeClient.accounts.retrieve(stripeAccount.accountId);
    if (!account.payouts_enabled || account.capabilities?.transfers !== "active") {
      throw new Error("Worker's connected account cannot receive transfers yet");
    }

    const transferParams = {
      amount: incentive.workerPayoutCents,
      currency: "usd",
      destination: stripeAccount.accountId,
      transfer_group: `WURKZI_JOB_${jobId}`,
      metadata: { jobId, workerId: incentive.workerId, type: "FIRST_FIVE_JOB_INCENTIVE" },
    };
    if (application?.depositId) {
      const deposit = await stripeClient.paymentIntents.retrieve(application.depositId, { expand: ["latest_charge"] });
      const chargeId = typeof deposit.latest_charge === "string" ? deposit.latest_charge : deposit.latest_charge?.id;
      if (chargeId) transferParams.source_transaction = chargeId;
    }
    const priorTransfers = await stripeClient.transfers.list({ transfer_group: transferParams.transfer_group, limit: 100 });
    const priorTransfer = priorTransfers.data.find((item) => item.metadata?.jobId === jobId && item.metadata?.type === "FIRST_FIVE_JOB_INCENTIVE");
    const transfer = priorTransfer || await stripeClient.transfers.create(transferParams, {
      idempotencyKey: `wurkzi-first-five-${jobId}`,
    });

    return await prisma.$transaction(async (tx) => {
      const current = await tx.jobIncentive.findUnique({ where: { jobId } });
      if (!current) return null;
      if (current.hirerCreditGrantedAt) {
        return tx.jobIncentive.update({
          where: { jobId },
          data: { stripeTransferId: transfer.id, payoutStatus: "PAID", lastPayoutError: null },
        });
      }
      const claimed = await tx.jobIncentive.updateMany({
        where: { jobId, hirerCreditGrantedAt: null },
        data: {
          stripeTransferId: transfer.id,
          payoutStatus: "PAID",
          hirerCreditGrantedAt: new Date(),
          lastPayoutError: null,
        },
      });
      if (!claimed.count) return tx.jobIncentive.findUnique({ where: { jobId } });
      await tx.userProfile.update({
        where: { userId: current.hirerId },
        data: { platformCreditCents: { increment: current.hirerCreditCents } },
      });
      return tx.jobIncentive.findUnique({ where: { jobId } });
    });
  } catch (error) {
    const attempts = incentive.payoutAttempts + 1;
    const retryMs = Math.min(30_000 * (2 ** Math.min(attempts - 1, 8)), 3_600_000);
    await prisma.jobIncentive.update({
      where: { jobId },
      data: {
        payoutStatus: "FAILED",
        payoutAttempts: { increment: 1 },
        nextPayoutAttemptAt: new Date(Date.now() + retryMs),
        lastPayoutError: String(error.message || "Incentive payout failed").slice(0, 500),
      },
    });
    console.error("Job incentive transfer failed:", { jobId, message: error.message });
    return null;
  }
}

let retryTimer;
let retryRunning = false;
async function retryPendingIncentives() {
  if (retryRunning) return;
  retryRunning = true;
  try {
    const due = await prisma.jobIncentive.findMany({
      where: { payoutStatus: { in: ["PENDING", "FAILED"] }, nextPayoutAttemptAt: { lte: new Date() } },
      select: { jobId: true },
      take: 20,
      orderBy: { nextPayoutAttemptAt: "asc" },
    });
    const missing = await prisma.payment.findMany({
      where: { status: "PAID", job: { is: { status: "COMPLETED", incentive: { is: null } } } },
      select: { jobId: true },
      distinct: ["jobId"],
      take: 20,
    });
    for (const jobId of new Set([...due.map((item) => item.jobId), ...missing.map((item) => item.jobId)])) {
      await processJobIncentive(jobId);
    }
  } catch (error) {
    console.error("Job incentive retry worker error:", error.message);
  } finally {
    retryRunning = false;
  }
}

function startIncentiveRetryWorker() {
  if (retryTimer) return;
  retryTimer = setInterval(retryPendingIncentives, 60_000);
  retryTimer.unref?.();
  retryPendingIncentives();
}

module.exports = { processJobIncentive, startIncentiveRetryWorker, retryPendingIncentives };
