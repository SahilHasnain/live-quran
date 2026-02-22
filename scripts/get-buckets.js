/**
 * List all storage buckets in Appwrite
 */

const { Client, Storage } = require("node-appwrite");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function listBuckets() {
  try {
    console.log("📦 Fetching storage buckets...\n");

    const buckets = await storage.listBuckets();

    console.log(`Found ${buckets.total} bucket(s):\n`);

    buckets.buckets.forEach((bucket) => {
      console.log(`- Name: ${bucket.name}`);
      console.log(`  ID: ${bucket.$id}`);
      console.log(
        `  Max File Size: ${(bucket.maximumFileSize / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log(`  Enabled: ${bucket.enabled}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response);
    }
  }
}

listBuckets();
