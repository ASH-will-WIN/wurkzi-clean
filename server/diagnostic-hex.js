require("dotenv").config();

/**
 * Diagnostic script to check for hidden characters in your STRIPE_SECRET_KEY
 */

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
    console.log("❌ No STRIPE_SECRET_KEY found.");
    process.exit(1);
}

console.log("=== Key Diagnostic (Hidden Characters) ===");
console.log(`Reported Length: ${key.length}`);

// Convert the string to a hex representation to see EXACTLY what is inside it
let hex = "";
let hasHidden = false;

for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i);
    hex += code.toString(16).padStart(2, '0') + " ";

    // Check if character is "weird" (not a normal alphanumeric character or underscore)
    if (!/[a-zA-Z0-9_]/.test(key[i])) {
        // Only prefixes like sk_live_ use underscores, the rest should be alphanumeric
        if (i > 7) {
            hasHidden = true;
        }
    }
}

console.log("\nHex Representation (Raw Bytes):");
console.log(hex);

console.log("\n--- Findings ---");
if (hasHidden) {
    console.log("⚠️ WARNING: I found non-alphanumeric characters in your key string!");
    console.log("This usually means there are hidden spaces, newlines, or quotes inside the variable.");
} else {
    console.log("✅ The string contains only alphanumeric characters and underscores.");
}

if (key.startsWith('"') || key.endsWith('"')) {
    console.log("⚠️ WARNING: The key starts or ends with quote marks (\"). Some systems include these as part of the key!");
}

if (key.length !== 107) {
    console.log(`⚠️ WARNING: The key is ${key.length} characters long. Stripe keys are usually exactly 107 characters.`);
}

console.log("\nTIP: If there are hidden characters, use the .replace() fix I suggested earlier in your db.js file.");
console.log("==========================================\n");
