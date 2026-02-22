/**
 * Fetch Appwrite Collection Schema
 */

const { Client, Databases } = require("node-appwrite");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function getCollectionSchema() {
  try {
    console.log("📊 Fetching collection schema...\n");

    const collection = await databases.getCollection(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_QURAN_AUDIOS_COLLECTION_ID,
    );

    console.log("Collection Name:", collection.name);
    console.log("Collection ID:", collection.$id);
    console.log("\nAttributes:");

    collection.attributes.forEach((attr) => {
      console.log(`\n- ${attr.key}`);
      console.log(`  Type: ${attr.type}`);
      console.log(`  Required: ${attr.required}`);
      if (attr.array) console.log(`  Array: ${attr.array}`);
      if (attr.size) console.log(`  Size: ${attr.size}`);
      if (attr.default !== undefined) console.log(`  Default: ${attr.default}`);
    });

    console.log("\n\nIndexes:");
    collection.indexes.forEach((index) => {
      console.log(`\n- ${index.key}`);
      console.log(`  Type: ${index.type}`);
      console.log(`  Attributes: ${index.attributes.join(", ")}`);
    });

    // Also check for existing documents to understand the structure
    console.log("\n\n📄 Sample Documents:");
    const docs = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_QURAN_AUDIOS_COLLECTION_ID,
      [],
    );

    if (docs.documents.length > 0) {
      console.log(`\nFound ${docs.total} documents. Sample:`);
      console.log(JSON.stringify(docs.documents[0], null, 2));
    } else {
      console.log("\nNo documents found in collection.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response);
    }
  }
}

getCollectionSchema();
