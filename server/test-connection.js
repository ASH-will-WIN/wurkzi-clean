const { PrismaClient } = require("@prisma/client");

async function testConnection() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful!");

    // Try a simple query
    const count = await prisma.job.count();
    console.log(`Found ${count} jobs in the database`);

    // Test job application table
    try {
      const appCount = await prisma.jobApplication.count();
      console.log(`Found ${appCount} job applications`);
    } catch (e) {
      console.log("JobApplication table might not exist yet");
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("Possible causes:");
      console.error("- DATABASE_URL is incorrect");
      console.error(
        "- Database is suspended (free tier projects get suspended after 7 days of inactivity)"
      );
      console.error("- Network firewall is blocking port 5432");
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
