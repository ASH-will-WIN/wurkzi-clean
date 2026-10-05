const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

// Validate environment variables
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_KEY", "STRIPE_SECRET_KEY"];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

const { PrismaClient } = require("@prisma/client");

// Initialize singleton Prisma Client with explicit config
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});

let prisma;
try {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ["query", "info", "warn", "error"],
    errorFormat: "minimal",
  });
} catch (err) {
  console.error("Prisma initialization error:", err);
  process.exit(1);
}

// Initialize Supabase client with validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl.startsWith("https://") || !supabaseKey.startsWith("ey")) {
  throw new Error("Invalid Supabase credentials format");
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Stripe client with validation and sanitization
const stripe = require("stripe");

// Remove any spaces, newlines, literal \n string, or accidental double quotes that might have been copied
const rawSecretKey = process.env.STRIPE_SECRET_KEY || "";
const sanitizedSecretKey = rawSecretKey
  .trim()
  .replace(/^"|"$/g, "")    // Remove wrapping quotes
  .replace(/\\n/g, "")       // Remove literal \n strings
  .replace(/\\r/g, "")       // Remove literal \r strings
  .replace(/\s/g, "");       // Remove all internal whitespace/newlines

// Basic key mode validation and sanitization
if (sanitizedSecretKey.startsWith("sk_live") &&
  (process.env.STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test") ||
    process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test"))) {
  console.warn("⚠️ WARNING: Stripe Secret Key is in LIVE mode, but Publishable Key is in TEST mode. This will cause errors.");
}

const stripeClient = stripe(sanitizedSecretKey);

const {
  JobStatus,
  PaymentStatus,
  ApplicationStatus,
  DepositStatus,
} = require("@prisma/client");

module.exports = {
  prisma,
  supabase,
  stripeClient,
  JobStatus,
  PaymentStatus,
  ApplicationStatus, // Add this
  DepositStatus, // Add this
};
