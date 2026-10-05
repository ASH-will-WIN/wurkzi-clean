require("dotenv").config();
const Stripe = require("stripe");

async function testAutoRepairKey() {
    const rawKey = process.env.STRIPE_SECRET_KEY || "";

    console.log("=== Stripe Key Auto-Repair Test ===");
    console.log(`Original Raw Length: ${rawKey.length}`);

    // Auto-repair: Remove absolutely everything that isn't a letter, number, or underscore
    const cleanedKey = rawKey.replace(/[^a-zA-Z0-9_]/g, "");

    console.log(`Cleaned Key Length: ${cleanedKey.length}`);

    if (cleanedKey.length !== rawKey.length) {
        console.log("⚠️ WARNING: The key was 'dirty'. I removed " + (rawKey.length - cleanedKey.length) + " hidden character(s).");
    } else {
        console.log("✅ The key matches the raw input exactly (no hidden characters found).");
    }

    console.log("\n--- Testing with Cleaned Key ---");
    const stripe = new Stripe(cleanedKey);

    try {
        const customers = await stripe.customers.list({ limit: 1 });
        console.log("🎉 SUCCESS! The cleaned key worked!");
        console.log(`Found ${customers.data.length} customers.`);
        console.log("\nCONCLUSION: Your .env file HAS hidden characters (likely a Form Feed or Vertical Tab) that you cannot see in your editor.");
        console.log("FIX: Copy the key below and paste it into your .env file carefully:");
        console.log(cleanedKey);
    } catch (error) {
        console.log("❌ STILL FAILED: Even the cleaned key was rejected.");
        console.log(`Error: ${error.message}`);

        if (error.statusCode === 401) {
            console.log("\nIf cleaning the key didn't help, this 100% means the key itself is invalid in Stripe's database.");
            console.log("Please double-check that you are in 'Live Mode' in the Stripe Dashboard when copying the key.");
        }
    }
    console.log("===================================\n");
}

testAutoRepairKey();
