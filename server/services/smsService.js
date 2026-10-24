const twilio = require("twilio");

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

function getTwilioSender() {
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    return { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID };
  }
  if (process.env.TWILIO_PHONE_NUMBER) return { from: process.env.TWILIO_PHONE_NUMBER };
  return null;
}

function normalizePhoneNumber(phone) {
  if (typeof phone !== "string") return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  // Accept common display formats such as +1 (555) 123-4567, then send
  // Twilio a normalized E.164 number.
  if (trimmed.startsWith("+")) {
    return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

async function createTwilioMessage(to, body, extra = {}) {
  const sender = getTwilioSender();
  if (!client) throw new Error("Twilio credentials are not configured");
  if (!sender) throw new Error("Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER");
  const destination = normalizePhoneNumber(to);
  if (!destination) throw new Error("Recipient phone number is not in a supported format");
  return client.messages.create({ to: destination, body, ...sender, ...extra });
}

function getVerifyService() {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!client || !serviceSid) {
    const error = new Error("Phone verification is not configured");
    error.code = "PHONE_VERIFICATION_NOT_CONFIGURED";
    throw error;
  }
  return client.verify.v2.services(serviceSid);
}

function isPhoneVerificationConfigured() {
  return Boolean(client && process.env.TWILIO_VERIFY_SERVICE_SID);
}

async function startPhoneVerification(phone) {
  const destination = normalizePhoneNumber(phone);
  if (!destination) {
    const error = new Error("Please enter a valid phone number");
    error.code = "INVALID_PHONE_NUMBER";
    throw error;
  }
  return getVerifyService().verifications.create({ to: destination, channel: "sms" });
}

async function checkPhoneVerification(phone, code) {
  const destination = normalizePhoneNumber(phone);
  if (!destination) return false;
  try {
    const result = await getVerifyService().verificationChecks.create({
      to: destination,
      code: String(code).trim(),
    });
    return result.status === "approved";
  } catch (error) {
    // Twilio removes verification records after approval, expiry, or max attempts.
    // Treat those outcomes as a failed code; let other provider/configuration errors surface.
    if (error.status === 404 || [20404, 60202].includes(Number(error.code))) return false;
    throw error;
  }
}

/**
 * Send SMS notification to a user
 * @param {string} to - Phone number to send SMS to
 * @param {string} message - Message content
 * @returns {Promise<boolean>} - True if SMS was accepted by Twilio
 */
const sendSMS = async (to, message) => {
  try {
    const result = await createTwilioMessage(to, message);
    console.log("SMS sent successfully:", result.sid);
    return Boolean(result?.sid);
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    return null;
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
  createTwilioMessage,
  normalizePhoneNumber,
  startPhoneVerification,
  checkPhoneVerification,
  isPhoneVerificationConfigured,
};
