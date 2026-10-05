require("dotenv").config();

/**
 * Stripe Key Verification Script
 * Run this to diagnose issues with your Stripe API keys
 */

console.log("=== Stripe Key Verification ===\n");

const secretKey = process.env.STRIPE_SECRET_KEY || "";
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || "";

console.log("1. SECRET KEY ANALYSIS:");
console.log(`   - Length: ${secretKey.length} characters`);
console.log(`   - Starts with: ${secretKey.substring(0, 8)}`);
console.log(`   - Ends with: ...${secretKey.substring(secretKey.length - 10)}`);
console.log(`   - Expected length: 107 characters`);
console.log(`   - Valid format: ${secretKey.length === 107 && secretKey.startsWith('sk_') ? '✅ YES' : '❌ NO'}`);

// Check for common issues
const issues = [];
if (secretKey.includes('\n') || secretKey.includes('\r')) {
    issues.push("Contains newline characters");
}
if (secretKey.includes(' ')) {
    issues.push("Contains spaces");
}
if (secretKey.includes('"') || secretKey.includes("'")) {
    issues.push("Contains quotes");
}
if (!secretKey.startsWith('sk_live_') && !secretKey.startsWith('sk_test_')) {
    issues.push("Doesn't start with sk_live_ or sk_test_");
}
if (secretKey.length !== 107) {
    issues.push(`Wrong length: ${secretKey.length} instead of 107`);
}

if (issues.length > 0) {
    console.log("\n   ⚠️ ISSUES FOUND:");
    issues.forEach(issue => console.log(`      - ${issue}`));
} else {
    console.log("\n   ✅ No obvious formatting issues");
}

console.log("\n2. PUBLISHABLE KEY ANALYSIS:");
console.log(`   - Length: ${publishableKey.length} characters`);
console.log(`   - Starts with: ${publishableKey.substring(0, 8)}`);
console.log(`   - Expected length: 107 characters`);
console.log(`   - Valid format: ${publishableKey.length === 107 && publishableKey.startsWith('pk_') ? '✅ YES' : '❌ NO'}`);

console.log("\n3. MODE CHECK:");
const secretMode = secretKey.includes('_test_') ? 'TEST' : secretKey.includes('_live_') ? 'LIVE' : 'UNKNOWN';
const publishableMode = publishableKey.includes('_test_') ? 'TEST' : publishableKey.includes('_live_') ? 'LIVE' : 'UNKNOWN';

console.log(`   - Secret Key: ${secretMode}`);
console.log(`   - Publishable Key: ${publishableMode}`);
console.log(`   - Keys match: ${secretMode === publishableMode ? '✅ YES' : '❌ NO - THIS WILL CAUSE ERRORS!'}`);

console.log("\n4. RECOMMENDATION:");
if (secretKey.length !== 107) {
    console.log("   ❌ Your secret key is the WRONG LENGTH.");
    console.log("   → Go to: https://dashboard.stripe.com/apikeys");
    console.log("   → Click 'Reveal live key' or 'Reveal test key'");
    console.log("   → Copy the ENTIRE key (should be exactly 107 characters)");
    console.log("   → Update your .env file: STRIPE_SECRET_KEY=sk_live_...");
    console.log("   → Make sure there are NO quotes, spaces, or extra characters");
} else if (issues.length > 0) {
    console.log("   ⚠️ Your key has formatting issues - clean it up in your .env file");
} else {
    console.log("   ✅ Your keys appear to be formatted correctly!");
}

console.log("\n================================\n");
