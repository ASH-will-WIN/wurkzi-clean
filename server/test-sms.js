const { prisma } = require("./db");
const { sendSMS, getUserPhoneNumber } = require("./services/smsService");

async function testSMS() {
  console.log("Testing SMS functionality...");

  // Test sending a direct SMS (if Twilio is configured)
  try {
    const result = await sendSMS("12487640275", "Test message from Wurkzi");
    console.log("Direct SMS test result:", result);
  } catch (error) {
    console.error("Error in direct SMS test:", error);
  }

  // Test getting user phone number (if any users exist)
  try {
    console.log("Prisma object:", prisma);
    if (!prisma) {
      console.log("Prisma is not initialized");
      return;
    }
    const users = await prisma.userProfile.findMany({ take: 1 });
    if (users.length > 0) {
      const phone = await getUserPhoneNumber(users[0].userId, prisma);
      console.log("User phone number test result:", phone);
    } else {
      console.log("No users found for phone number test");
    }
  } catch (error) {
    console.error("Error in user phone number test:", error);
  }

  console.log("SMS testing completed.");
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSMS()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

module.exports = { testSMS };
