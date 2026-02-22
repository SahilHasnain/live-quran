/**
 * Cleanup Orphaned Files
 * Removes files from storage bucket that don't have corresponding documents
 */

const { Client, Storage, Databases, Query } = require("node-appwrite");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);
const databases = new Databases(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.APPWRITE_QURAN_AUDIOS_COLLECTION_ID;
const BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

/**
 * Get all file IDs from documents
 */
async function getAllDocumentFileIds() {
  const fileIds = new Set();
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    response.documents.forEach((doc) => {
      if (doc.fileId) {
        fileIds.add(doc.fileId);
      }
    });

    if (response.documents.length < limit) {
      break;
    }

    offset += limit;
  }

  return fileIds;
}

/**
 * Get all files from storage bucket
 */
async function getAllStorageFiles() {
  const files = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await storage.listFiles(BUCKET_ID, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    files.push(...response.files);

    if (response.files.length < limit) {
      break;
    }

    offset += limit;
  }

  return files;
}

/**
 * Main cleanup process
 */
async function main() {
  console.log("🧹 Cleanup Orphaned Files\n");

  try {
    // Get all file IDs from documents
    console.log("📄 Fetching document file IDs...");
    const documentFileIds = await getAllDocumentFileIds();
    console.log(
      `✓ Found ${documentFileIds.size} files referenced in documents\n`,
    );

    // Get all files from storage
    console.log("📦 Fetching storage files...");
    const storageFiles = await getAllStorageFiles();
    console.log(`✓ Found ${storageFiles.length} files in storage\n`);

    // Find orphaned files
    const orphanedFiles = storageFiles.filter(
      (file) => !documentFileIds.has(file.$id),
    );

    if (orphanedFiles.length === 0) {
      console.log("✨ No orphaned files found!");
      return;
    }

    console.log(`⚠️  Found ${orphanedFiles.length} orphaned files:\n`);

    // List orphaned files
    orphanedFiles.forEach((file, index) => {
      const sizeMB = (file.sizeOriginal / 1024 / 1024).toFixed(2);
      console.log(`${index + 1}. ${file.name} (${sizeMB}MB) - ID: ${file.$id}`);
    });

    console.log("\n🗑️  Deleting orphaned files...\n");

    // Delete orphaned files
    let deleted = 0;
    let failed = 0;

    for (const file of orphanedFiles) {
      try {
        await storage.deleteFile(BUCKET_ID, file.$id);
        console.log(`✓ Deleted: ${file.name}`);
        deleted++;
      } catch (error) {
        console.error(`✗ Failed to delete ${file.name}: ${error.message}`);
        failed++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary:");
    console.log(`  Total orphaned: ${orphanedFiles.length}`);
    console.log(`  Deleted: ${deleted}`);
    console.log(`  Failed: ${failed}`);
    console.log("=".repeat(60));

    console.log("\n✨ Cleanup complete!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

main();
