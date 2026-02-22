/**
 * Create Tilawat Storage Bucket in Appwrite
 * - Creates a new storage bucket for Tilawat audio files
 * - Updates .env.local with the new bucket ID
 */

const { Client, Storage, ID, Permission, Role } = require("node-appwrite");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

// Configuration from .env.local
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);

/**
 * Create Tilawat storage bucket
 */
async function createTilawatBucket() {
  console.log("🗄️  Creating Tilawat Storage Bucket in Appwrite\n");

  try {
    console.log("📦 Creating bucket...");

    const bucket = await storage.createBucket(
      ID.unique(),
      "Tilawat Audio Files",
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      false, // fileSecurity
      true, // enabled
      500 * 1024 * 1024, // maxFileSize: 500MB
      ["audio/mp4", "audio/m4a", "audio/mpeg", "audio/mp3"], // allowedFileExtensions
      "none", // compression
      false, // encryption
      true, // antivirus
    );

    const bucketId = bucket.$id;
    console.log(`✓ Bucket created: ${bucketId}\n`);

    console.log("✅ Bucket created successfully!");
    console.log(`Bucket ID: ${bucketId}`);
    console.log(`Bucket Name: ${bucket.name}`);
    console.log(`Max File Size: ${bucket.maxFileSize / (1024 * 1024)}MB`);
    console.log(
      `Allowed Extensions: ${bucket.allowedFileExtensions.join(", ")}\n`,
    );

    return bucketId;
  } catch (error) {
    console.error("\n❌ Error creating bucket:", error.message);
    throw error;
  }
}

/**
 * Update .env.local with the new bucket ID
 */
function updateEnvFile(bucketId) {
  console.log("📝 Updating .env.local...");

  const envPath = path.resolve(__dirname, "..", ".env.local");
  let envContent = fs.readFileSync(envPath, "utf8");

  // Replace the placeholder with actual bucket ID
  if (
    envContent.includes("APPWRITE_TILAWAT_BUCKET_ID=YOUR_TILAWAT_BUCKET_ID")
  ) {
    envContent = envContent.replace(
      "APPWRITE_TILAWAT_BUCKET_ID=YOUR_TILAWAT_BUCKET_ID",
      `APPWRITE_TILAWAT_BUCKET_ID=${bucketId}`,
    );
  } else if (envContent.includes("APPWRITE_TILAWAT_BUCKET_ID=")) {
    // Update existing value
    envContent = envContent.replace(
      /APPWRITE_TILAWAT_BUCKET_ID=.*/,
      `APPWRITE_TILAWAT_BUCKET_ID=${bucketId}`,
    );
  } else {
    // Add new line if not exists
    envContent += `\nAPPWRITE_TILAWAT_BUCKET_ID=${bucketId}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("✓ .env.local updated\n");
}

/**
 * Main process
 */
async function main() {
  // Validate environment variables
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.error("❌ Missing Appwrite configuration in .env.local");
    console.error(
      "Required: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY",
    );
    process.exit(1);
  }

  try {
    // Create bucket
    const bucketId = await createTilawatBucket();

    // Update .env.local
    updateEnvFile(bucketId);

    console.log("=".repeat(60));
    console.log("✨ Bucket Setup Complete!");
    console.log("=".repeat(60));
    console.log("\nYou can now run: npm run upload-tilawat");
    console.log("\n");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

main();
