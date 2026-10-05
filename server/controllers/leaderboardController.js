const { prisma } = require("../db");
const { getActiveSeason } = require("../services/leaderboardService");

const AUDIENCES = ["STUDENT", "NEIGHBOR"];
const rankingOrder = [{ points: "desc" }, { qualifyingJobCount: "desc" }, { successfulReferralCount: "desc" }, { lastPointAt: "asc" }, { createdAt: "asc" }];

const prizes = {
  STUDENT: "$500 cash prize after eligibility review",
  NEIGHBOR: "A standard exterior house wash and a 50-inch TV, or a $350 retailer gift card if the TV is unavailable",
};

function publicEntry(participant, rank) {
  return { rank, nickname: participant.nickname, points: participant.points };
}

async function getActiveLeaderboard(req, res) {
  try {
    const audience = String(req.query.audience || "STUDENT").toUpperCase();
    if (!AUDIENCES.includes(audience)) return res.status(400).json({ error: "invalid_audience" });
    const season = await getActiveSeason();
    if (!season) return res.json({ season: null, audience, entries: [], prize: prizes[audience] });
    const participants = await prisma.leaderboardParticipant.findMany({ where: { seasonId: season.id, audience }, orderBy: rankingOrder, take: 50 });
    res.json({
      season: { id: season.id, name: season.name, startsAt: season.startsAt, endsAt: season.endsAt },
      audience,
      prize: prizes[audience],
      entries: participants.map((participant, index) => publicEntry(participant, index + 1)),
    });
  } catch (error) {
    console.error("Get Leaderboard Error:", error.message);
    res.status(500).json({ error: "leaderboard_retrieval_failed" });
  }
}

async function enroll(req, res) {
  try {
    const audience = String(req.body.audience || "").toUpperCase();
    const nickname = String(req.body.nickname || "").trim();
    const schoolName = String(req.body.schoolName || "").trim();
    const schoolEmail = String(req.body.schoolEmail || "").trim().toLowerCase();
    if (!AUDIENCES.includes(audience)) return res.status(400).json({ error: "invalid_audience" });
    if (!/^[A-Za-z0-9 _-]{2,24}$/.test(nickname)) return res.status(400).json({ error: "invalid_nickname", message: "Use 2–24 letters, numbers, spaces, underscores, or hyphens." });
    if (audience === "STUDENT" && (schoolName.length < 2 || schoolName.length > 80 || !/^\S+@\S+\.\S+$/.test(schoolEmail))) {
      return res.status(400).json({ error: "student_details_required", message: "Students need a school name and school email for prize verification." });
    }
    const season = await getActiveSeason();
    if (!season) return res.status(409).json({ error: "no_active_season" });

    const participant = await prisma.leaderboardParticipant.create({
      data: {
        seasonId: season.id,
        userId: req.user.id,
        audience,
        nickname,
        schoolName: audience === "STUDENT" ? schoolName : null,
        schoolEmail: audience === "STUDENT" ? schoolEmail : null,
        verificationStatus: audience === "STUDENT" ? "PENDING" : "VERIFIED",
        verifiedAt: audience === "NEIGHBOR" ? new Date() : null,
      },
    });
    res.status(201).json({ participant: serializeMine(participant), season: { id: season.id, name: season.name, endsAt: season.endsAt } });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "already_enrolled", message: "You are already enrolled in this season and cannot switch boards." });
    console.error("Leaderboard Enrollment Error:", error.message);
    res.status(500).json({ error: "leaderboard_enrollment_failed" });
  }
}

async function getMyLeaderboardStatus(req, res) {
  try {
    const season = await getActiveSeason();
    if (!season) return res.json({ season: null, participant: null, rank: null });
    const participant = await prisma.leaderboardParticipant.findUnique({ where: { seasonId_userId: { seasonId: season.id, userId: req.user.id } } });
    if (!participant) return res.json({ season: { id: season.id, name: season.name, startsAt: season.startsAt, endsAt: season.endsAt }, participant: null, rank: null });
    const ranked = await prisma.leaderboardParticipant.findMany({ where: { seasonId: season.id, audience: participant.audience }, orderBy: rankingOrder, select: { id: true } });
    res.json({ season: { id: season.id, name: season.name, startsAt: season.startsAt, endsAt: season.endsAt }, participant: serializeMine(participant), rank: ranked.findIndex((entry) => entry.id === participant.id) + 1 });
  } catch (error) {
    console.error("My Leaderboard Status Error:", error.message);
    res.status(500).json({ error: "leaderboard_status_failed" });
  }
}

function serializeMine(participant) {
  return {
    audience: participant.audience,
    nickname: participant.nickname,
    points: participant.points,
    qualifyingJobCount: participant.qualifyingJobCount,
    successfulReferralCount: participant.successfulReferralCount,
    verificationStatus: participant.verificationStatus,
  };
}

module.exports = { getActiveLeaderboard, enroll, getMyLeaderboardStatus };
