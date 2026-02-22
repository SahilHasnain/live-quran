const { Client, Storage } = require("node-appwrite");
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env.local"),
});

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function fixBucket() {
  try {
    await storage.updateBucket(
      process.env.APPWRITE_TRANSLATION_BUCKET_ID,
      "Translation Audio Files",
      undefined, // permissions - keep existing
      undefined, // fileSecurity
      true, // enabled
      500 * 1024 * 1024, // maxFileSize: 500MB
      [], // allowedFileExtensions - empty array allows all
      "none", // compression
      false, // encryption
      true, // antivirus
    );
    console.log("✅ Bucket updated - all file types allowed");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fixBucket();
