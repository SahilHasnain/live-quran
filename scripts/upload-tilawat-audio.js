/**
 * Tilawat Audio Upload Script
 * - Fetches metadata from YouTube API
 * - Downloads audio with yt-dlp
 * - Uploads to Appwrite (Tilawat Collection)
 * - Skips already uploaded videos
 */

const { spawn } = require("child_process");
const { Client, Storage, Databases, ID, Query } = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

// Configuration from .env.local
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.APPWRITE_TILAWAT_COLLECTION_ID;
const BUCKET_ID = process.env.APPWRITE_TILAWAT_BUCKET_ID;
const YOUTUBE_PLAYLIST_URL = process.env.YOUTUBE_TILAWAT_PLAYLIST_URL;

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : null;

const TEMP_DIR = path.join(__dirname, "temp_tilawat_audio");

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);
const databases = new Databases(client);

/**
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch video metadata from YouTube API
 */
async function fetchVideoMetadata(videoIds) {
  const baseUrl = "https://www.googleapis.com/youtube/v3";
  const url = `${baseUrl}/videos?part=contentDetails,snippet&id=${videoIds.join(",")}&key=${YOUTUBE_API_KEY}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items.map((video) => ({
    id: video.id,
    title: video.snippet.title,
    duration: parseDuration(video.contentDetails.duration),
    thumbnail:
      video.snippet.thumbnails.high?.url ||
      video.snippet.thumbnails.medium?.url ||
      null,
    uploader: video.snippet.channelTitle || null,
    uploadDate: video.snippet.publishedAt.split("T")[0],
  }));
}

/**
 * Get playlist video IDs using yt-dlp
 */
async function getPlaylistVideos() {
  console.log("📥 Fetching Tilawat playlist videos...");

  return new Promise((resolve, reject) => {
    const args = ["--flat-playlist", "--print", "id"];

    if (limit !== null) {
      args.push("--playlist-end", limit.toString());
    }

    args.push(YOUTUBE_PLAYLIST_URL);

    const ytdlp = spawn("yt-dlp", args);

    let output = "";
    let errorOutput = "";

    ytdlp.stdout.on("data", (data) => (output += data.toString()));
    ytdlp.stderr.on("data", (data) => (errorOutput += data.toString()));

    ytdlp.on("close", (code) => {
      if (code === 0) {
        const videoIds = output.trim().split("\n").filter(Boolean);
        console.log(`✓ Found ${videoIds.length} videos\n`);
        resolve(videoIds);
      } else {
        reject(new Error(`yt-dlp failed: ${errorOutput}`));
      }
    });
  });
}

/**
 * Check if audio already exists in database
 */
async function audioExists(youtubeId) {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal("youtubeId", youtubeId),
      Query.limit(1),
    ]);
    return response.documents.length > 0;
  } catch (error) {
    console.error(`  ⚠️  Error checking existence: ${error.message}`);
    return false;
  }
}

/**
 * Download audio using yt-dlp
 */
async function downloadAudio(videoId, index, total) {
  const outputPath = path.join(TEMP_DIR, `${videoId}.m4a`);

  console.log(`[${index + 1}/${total}] Downloading: ${videoId}`);

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const ytdlp = spawn("yt-dlp", [
      "-f",
      "bestaudio[ext=m4a]/bestaudio",
      "--extract-audio",
      "--audio-format",
      "m4a",
      "--audio-quality",
      "128K",
      "--max-filesize",
      "200M",
      "-o",
      outputPath,
      "--no-playlist",
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);

    let errorOutput = "";

    ytdlp.stdout.on("data", () => process.stdout.write("."));
    ytdlp.stderr.on("data", (data) => (errorOutput += data.toString()));

    ytdlp.on("close", (code) => {
      console.log(""); // New line

      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`  ✓ Downloaded`);
        resolve(outputPath);
      } else {
        reject(new Error(`Download failed: ${errorOutput}`));
      }
    });
  });
}

/**
 * Upload file to Appwrite Storage and create document
 */
async function uploadToAppwrite(filePath, metadata) {
  console.log(`  📤 Uploading to Appwrite...`);

  try {
    const fileSize = fs.statSync(filePath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(`  File size: ${fileSizeMB}MB`);
    console.log(
      `  Duration: ${Math.floor(metadata.duration / 60)}m ${metadata.duration % 60}s`,
    );

    // Upload file to storage
    const file = await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      InputFile.fromPath(filePath, `${metadata.id}.m4a`),
    );

    console.log(`  ✓ File uploaded: ${file.$id}`);

    // Create document with metadata
    const documentData = {
      title: metadata.title,
      fileId: file.$id,
      duration: metadata.duration,
      youtubeId: metadata.id,
    };

    // Add optional fields if they exist
    if (metadata.thumbnail) documentData.thumbnail = metadata.thumbnail;
    if (metadata.uploader) documentData.uploader = metadata.uploader;
    if (metadata.uploadDate) documentData.uploadDate = metadata.uploadDate;

    const document = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      documentData,
    );

    console.log(`  ✅ Document created: ${document.$id}`);
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Main process
 */
async function main() {
  console.log("🎵 Tilawat Audio Upload Process\n");

  // Validate environment variables
  if (!YOUTUBE_API_KEY) {
    console.error("❌ Missing YOUTUBE_API_KEY in .env.local");
    process.exit(1);
  }

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.error("❌ Missing Appwrite configuration in .env.local");
    process.exit(1);
  }

  if (!YOUTUBE_PLAYLIST_URL) {
    console.error("❌ Missing YOUTUBE_TILAWAT_PLAYLIST_URL in .env.local");
    process.exit(1);
  }

  if (!COLLECTION_ID) {
    console.error("❌ Missing APPWRITE_TILAWAT_COLLECTION_ID in .env.local");
    process.exit(1);
  }

  if (!BUCKET_ID) {
    console.error("❌ Missing APPWRITE_TILAWAT_BUCKET_ID in .env.local");
    process.exit(1);
  }

  if (limit !== null) {
    console.log(`Limit: ${limit} videos\n`);
  } else {
    console.log("Processing entire playlist\n");
  }

  try {
    // Get video IDs from playlist
    const videoIds = await getPlaylistVideos();

    // Fetch metadata from YouTube API in batches of 50
    console.log("📊 Fetching metadata from YouTube API...");
    const allMetadata = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const metadata = await fetchVideoMetadata(batch);
      allMetadata.push(...metadata);
      process.stdout.write(".");
    }
    console.log(" Done!\n");

    // Process each video
    const results = [];
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      const metadata = allMetadata.find((m) => m.id === videoId);

      if (!metadata) {
        console.log(`⚠️  No metadata for ${videoId}, skipping\n`);
        continue;
      }

      // Check if already exists
      const exists = await audioExists(videoId);
      if (exists) {
        console.log(`[${i + 1}/${videoIds.length}] ${metadata.title}`);
        console.log(`  ⏭️  Already exists, skipping\n`);
        results.push({ success: true, videoId, skipped: true });
        continue;
      }

      let tempFile = null;
      try {
        // Download audio
        tempFile = await downloadAudio(videoId, i, videoIds.length);

        // Upload to Appwrite
        await uploadToAppwrite(tempFile, metadata);

        // Cleanup temp file
        fs.unlinkSync(tempFile);
        console.log(`  🗑️  Cleaned up temp file\n`);

        results.push({ success: true, videoId });

        // Delay between downloads to avoid rate limiting
        if (i < videoIds.length - 1) {
          console.log("⏳ Waiting 2 seconds...\n");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
        if (tempFile && fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        results.push({ success: false, videoId, error: error.message });
      }
    }

    // Summary
    console.log("=".repeat(60));
    console.log("📊 Summary:");
    console.log(`  Total: ${results.length}`);
    console.log(
      `  Success: ${results.filter((r) => r.success && !r.skipped).length}`,
    );
    console.log(`  Skipped: ${results.filter((r) => r.skipped).length}`);
    console.log(`  Failed: ${results.filter((r) => !r.success).length}`);
    console.log("=".repeat(60));

    // Cleanup temp directory
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true });
    }

    console.log("\n✨ Done!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

main();
