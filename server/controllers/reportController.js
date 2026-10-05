const { prisma } = require("../db");

const createReport = async (req, res) => {
    const { reportedId, jobId, reason } = req.body;
    const reporterId = req.user.id; // From authMiddleware

    if (!reason) {
        return res.status(400).json({ error: "Reason is required" });
    }

    if (!reportedId && !jobId) {
        return res.status(400).json({ error: "Must report either a user or a job" });
    }

    try {
        const report = await prisma.report.create({
            data: {
                reporterId,
                reportedId: reportedId || null,
                jobId: jobId || null,
                reason,
                status: "PENDING",
            },
        });

        res.status(201).json(report);
    } catch (error) {
        console.error("Create Report Error:", error);
        res.status(500).json({ error: "Failed to submit report" });
    }
};

module.exports = {
    createReport,
};
