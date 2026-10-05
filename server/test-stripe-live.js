require("dotenv").config();
const stripe = require("stripe");

async function testLiveKey() {
    // Use the secret key from your .env file
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
        console.error("❌ ERROR: No STRIPE_SECRET_KEY found in .env file.");
        process.exit(1);
    }

    console.log("=== Stripe Live Key Connectivity Test ===");
    console.log(`Checking key: ${secretKey.substring(0, 12)}...${secretKey.substring(secretKey.length - 4)}`);
    console.log(`Key Length: ${secretKey.length} characters`);

    const stripeClient = stripe(secretKey);

    try {
        console.log("\nAttempting to connect to Stripe...");

        // Test 1: Retrieve basic account info
        const account = await stripeClient.accounts.retrieve();
        console.log("✅ SUCCESS: Successfully connected to Stripe!");
        console.log(`   Account ID: ${account.id}`);
        console.log(`   Business Name: ${account.business_profile?.name || "Not set"}`);
        console.log(`   Charges Enabled: ${account.charges_enabled ? "✅" : "❌"}`);
        console.log(`   Payouts Enabled: ${account.payouts_enabled ? "✅" : "❌"}`);

        // Test 2: Check balance (verifies standard API access)
        const balance = await stripeClient.balance.retrieve();
        console.log("\n✅ SUCCESS: Successfully retrieved balance info.");

        console.log("\n--- CONCLUSION ---");
        if (secretKey.startsWith('sk_live_')) {
            console.log("Everything looks great! Your LIVE key is valid and working.");
        } else {
            console.log("Note: You are currently using a TEST key (sk_test_). It works, but it's not live.");
        }

    } catch (error) {
        console.error("\n❌ FAILED: Stripe rejected the connection.");
        console.error("-----------------------------------------");
        console.error(`Error Type: ${error.type}`);
        // This is the part that will show "invalid_request_error" or "authentication_error"
        console.error(`Status Code: ${error.statusCode}`);
        console.error(`Message: ${error.message}`);

        if (error.raw) {
            console.error(`Code: ${error.raw.code}`);
            console.error(`Decline Code: ${error.raw.decline_code}`);
        }

        console.log("\n--- TROUBLESHOOTING ---");
        if (error.statusCode === 401) {
            console.log("1. AUTHENTICATION ERROR (401): This means the key is fundamentally wrong.");
            console.log("   - Check for extra spaces or hidden characters in your .env");
            console.log("   - Re-copy the key from: https://dashboard.stripe.com/apikeys");
        } else if (error.message.includes("restricted")) {
            console.log("2. PERMISSION ERROR: Your API key is 'Restricted' and doesn't have permission to see account info.");
            console.log("   - Use the 'Secret Key' (sk_live_...) instead of a 'Restricted Key' (rk_live_...)");
        } else {
            console.log("3. Other Error: Check if your Stripe account is fully activated/verified.");
        }
    }
    console.log("=========================================\n");
}

testLiveKey();
