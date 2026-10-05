const twilio = require("twilio");

// Initialize Twilio client with environment variables
const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

/**
 * Send SMS notification to a user
 * @param {string} to - Phone number to send SMS to
 * @param {string} message - Message content
 * @returns {Promise<boolean>} - True if SMS was sent successfully
 */
const sendSMS = async (to, message) => {
  // If Twilio is not configured, log the message instead
  if (!client) {
    console.log("Twilio not configured. SMS notification:", { to, message });
    return false;
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log("SMS sent successfully:", result.sid);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
};

/**
 * Get user's phone number from their profile
 * @param {string} userId - User ID
 * @param {object} prisma - Prisma client instance
 * @returns {Promise<string|null>} - Phone number or null if not found
 */
const getUserPhoneNumber = async (userId, prisma) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId },
    });

    return profile ? profile.phone : null;
  } catch (error) {
    console.error("Error fetching user phone number:", error);
    return null;
  }
};

module.exports = {
  sendSMS,
  getUserPhoneNumber,
};
