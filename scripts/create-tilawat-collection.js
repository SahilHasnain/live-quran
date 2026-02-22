/**
 * Create Tilawat Collection in Appwrite
 * - Creates a new collection with the same schema as Tafseer
 * - Updates .env.local with the new collection ID
 */

const { Client, Databases, ID, Permission, Role } = require("node-appwrite");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

// Configuration from .env.local
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

/**
 * Create Tilawat collection with same schema as Tafseer
 */
async function createTilawatCollection() {
  console.log("🎵 Creating Tilawat Collection in Appwrite\n");

  try {
    // Create collection
    console.log("📦 Creating collection...");
    const collection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      "Tilawat Audios",
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
    );

    const collectionId = collection.$id;
    console.log(`✓ Collection created: ${collectionId}\n`);

    // Create attributes (same schema as Tafseer)
    console.log("📝 Creating attributes...");

    // title (string, required)
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      "title",
      500,
      true,
    );
    console.log("  ✓ title (string, required)");

    // fileId (string, required)
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      "fileId",
      100,
      true,
    );
    console.log("  ✓ fileId (string, required)");

    // duration (integer, required)
    await databases.createIntegerAttribute(
      DATABASE_ID,
      collectionId,
      "duration",
      true,
    );
    console.log("  ✓ duration (integer, required)");

    // youtubeId (string, required)
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      "youtubeId",
      50,
      true,
    );
    console.log("  ✓ youtubeId (string, required)");

    // thumbnail (string, optional)
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      "thumbnail",
      500,
      false,
    );
    console.log("  ✓ thumbnail (string, optional)");

    // uploader (string, optional)
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      "uploader",
      200,
      false,
    );
    console.log("  ✓ uploader (string, optional)");

    // uploadDate (string, optional)
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      "uploadDate",
      20,
      false,
    );
    console.log("  ✓ uploadDate (string, optional)");

    console.log("\n⏳ Waiting for attributes to be ready (30 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Create indexes
    console.log("\n🔍 Creating indexes...");

    // Index on youtubeId for quick lookups
    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      "youtubeId_index",
      "key",
      ["youtubeId"],
      ["asc"],
    );
    console.log("  ✓ youtubeId_index");

    // Index on uploadDate for sorting
    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      "uploadDate_index",
      "key",
      ["uploadDate"],
      ["desc"],
    );
    console.log("  ✓ uploadDate_index");

    console.log("\n✅ Collection created successfully!");
    console.log(`Collection ID: ${collectionId}\n`);

    return collectionId;
  } catch (error) {
    console.error("\n❌ Error creating collection:", error.message);
    throw error;
  }
}

/**
 * Update .env.local with the new collection ID
 */
function updateEnvFile(collectionId) {
  console.log("📝 Updating .env.local...");

  const envPath = path.resolve(__dirname, "..", ".env.local");
  let envContent = fs.readFileSync(envPath, "utf8");

  // Replace the placeholder with actual collection ID
  if (
    envContent.includes(
      "APPWRITE_TILAWAT_COLLECTION_ID=YOUR_TILAWAT_COLLECTION_ID",
    )
  ) {
    envContent = envContent.replace(
      "APPWRITE_TILAWAT_COLLECTION_ID=YOUR_TILAWAT_COLLECTION_ID",
      `APPWRITE_TILAWAT_COLLECTION_ID=${collectionId}`,
    );
  } else if (envContent.includes("APPWRITE_TILAWAT_COLLECTION_ID=")) {
    // Update existing value
    envContent = envContent.replace(
      /APPWRITE_TILAWAT_COLLECTION_ID=.*/,
      `APPWRITE_TILAWAT_COLLECTION_ID=${collectionId}`,
    );
  } else {
    // Add new line if not exists
    envContent += `\nAPPWRITE_TILAWAT_COLLECTION_ID=${collectionId}\n`;
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

  if (!DATABASE_ID) {
    console.error("❌ Missing APPWRITE_DATABASE_ID in .env.local");
    process.exit(1);
  }

  try {
    // Create collection
    const collectionId = await createTilawatCollection();

    // Update .env.local
    updateEnvFile(collectionId);

    console.log("=".repeat(60));
    console.log("✨ Setup Complete!");
    console.log("=".repeat(60));
    console.log("\nNext steps:");
    console.log("1. Set up Icecast mount point at /tilawat");
    console.log("2. Deploy Node.js streamer for Tilawat");
    console.log("3. Run: npm run upload-tilawat");
    console.log("\n");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

main();
