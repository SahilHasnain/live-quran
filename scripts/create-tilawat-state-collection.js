/**
 * Create Tilawat State Collection in Appwrite
 * Stores the current playing track state for the smart tilawat logic
 */

const { Client, Databases, ID, Permission, Role } = require("node-appwrite");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function createStateCollection() {
  console.log("🎵 Creating Tilawat State Collection in Appwrite\n");

  try {
    // Create collection
    console.log("📦 Creating collection...");
    const collection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      "Tilawat State",
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
    );

    const collectionId = collection.$id;
    console.log(`✓ Collection created: ${collectionId}\n`);

    // Create attributes
    console.log("📝 Creating attributes...");

    // currentTrackId (string, required) - ID of currently playing track
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      "currentTrackId",
      100,
      true,
    );
    console.log("  ✓ currentTrackId (string, required)");

    // startedAt (datetime, required) - When current track started
    await databases.createDatetimeAttribute(
      DATABASE_ID,
      collectionId,
      "startedAt",
      true,
    );
    console.log("  ✓ startedAt (datetime, required)");

    // elapsedSeconds (integer, required) - Seconds elapsed in current track
    await databases.createIntegerAttribute(
      DATABASE_ID,
      collectionId,
      "elapsedSeconds",
      true,
    );
    console.log("  ✓ elapsedSeconds (integer, required)");

    console.log("\n✅ Tilawat State Collection created successfully!");
    console.log(`\n📋 Add this to your .env.local:`);
    console.log(`APPWRITE_STATE_COLLECTION_ID=${collectionId}`);

    // Update .env.local
    const envPath = path.resolve(__dirname, "..", ".env.local");
    let envContent = fs.readFileSync(envPath, "utf8");

    if (envContent.includes("APPWRITE_STATE_COLLECTION_ID=")) {
      envContent = envContent.replace(
        /APPWRITE_STATE_COLLECTION_ID=.*/,
        `APPWRITE_STATE_COLLECTION_ID=${collectionId}`,
      );
    } else {
      envContent += `\nAPPWRITE_STATE_COLLECTION_ID=${collectionId}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("\n✓ Updated .env.local with collection ID");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

createStateCollection();
