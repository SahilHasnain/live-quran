/**
 * Tilawat Tracker Function
 * - Runs every minute as a cron job to track and advance tracks
 * - Also serves as API endpoint for frontend polling (GET/POST requests)
 */

import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  const isApiRequest = req.method === "GET" || req.method === "POST";

  log("=== TILAWAT TRACKER EXECUTION START ===");
  log(`Request type: ${isApiRequest ? "API REQUEST" : "CRON JOB"}`);
  log(`Method: ${req.method}`);
  log(`Timestamp: ${new Date().toISOString()}`);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
  const TILAWAT_COLLECTION_ID = process.env.APPWRITE_TILAWAT_COLLECTION_ID;
  const STATE_COLLECTION_ID = process.env.APPWRITE_STATE_COLLECTION_ID;
  const STATE_DOCUMENT_ID = "tilawat-state";

  try {
    // Get current state
    let state;
    try {
      log("Fetching current state from database...");
      state = await databases.getDocument(
        DATABASE_ID,
        STATE_COLLECTION_ID,
        STATE_DOCUMENT_ID,
      );
      log(
        `State found - Track ID: ${state.currentTrackId}, Started: ${state.startedAt}`,
      );
    } catch (err) {
      // Initialize state if doesn't exist
      log("State not found, initializing tilawat state...");
      const tilawats = await databases.listDocuments(
        DATABASE_ID,
        TILAWAT_COLLECTION_ID,
        [Query.orderAsc("$createdAt"), Query.limit(1)],
      );

      log(`Found ${tilawats.documents.length} tilawat tracks`);

      if (tilawats.documents.length === 0) {
        throw new Error("No tilawat tracks found");
      }

      state = await databases.createDocument(
        DATABASE_ID,
        STATE_COLLECTION_ID,
        STATE_DOCUMENT_ID,
        {
          currentTrackId: tilawats.documents[0].$id,
          startedAt: new Date().toISOString(),
          elapsedSeconds: 0,
        },
      );
      log(`State initialized with first track: ${tilawats.documents[0].title}`);
    }

    // Calculate elapsed time since track started
    const startedAt = new Date(state.startedAt);
    const now = new Date();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);

    log(`Time calculation:`);
    log(`  Started at: ${startedAt.toISOString()}`);
    log(`  Current time: ${now.toISOString()}`);
    log(`  Elapsed seconds: ${elapsedSeconds}`);

    // Get current track details
    log(`Fetching track details for ID: ${state.currentTrackId}`);
    const currentTrack = await databases.getDocument(
      DATABASE_ID,
      TILAWAT_COLLECTION_ID,
      state.currentTrackId,
    );

    log(`Current track: "${currentTrack.title}"`);
    log(`  Duration: ${currentTrack.duration}s`);
    log(`  Uploader: ${currentTrack.uploader || "Unknown"}`);
    log(`  File ID: ${currentTrack.fileId}`);

    // Check if track has finished (for both API and cron)
    log(
      `Checking if track finished: ${elapsedSeconds} >= ${currentTrack.duration}?`,
    );

    if (elapsedSeconds >= currentTrack.duration) {
      log("✓ TRACK FINISHED - Advancing to next track...");

      // Get all tracks ordered by creation date
      log("Fetching all tracks from database...");
      const allTracks = await databases.listDocuments(
        DATABASE_ID,
        TILAWAT_COLLECTION_ID,
        [Query.orderAsc("$createdAt"), Query.limit(500)],
      );

      log(`Total tracks in playlist: ${allTracks.documents.length}`);

      // Find current track index
      const currentIndex = allTracks.documents.findIndex(
        (t) => t.$id === state.currentTrackId,
      );

      log(`Current track index: ${currentIndex}`);

      // Get next track (loop back to first if at end)
      const nextIndex = (currentIndex + 1) % allTracks.documents.length;
      const nextTrack = allTracks.documents[nextIndex];

      log(`Next track index: ${nextIndex}`);
      log(`Next track: "${nextTrack.title}" (ID: ${nextTrack.$id})`);

      // Update state with next track
      log("Updating database with next track...");
      await databases.updateDocument(
        DATABASE_ID,
        STATE_COLLECTION_ID,
        STATE_DOCUMENT_ID,
        {
          currentTrackId: nextTrack.$id,
          startedAt: now.toISOString(),
          elapsedSeconds: 0,
        },
      );

      log("✓ Database updated successfully");
      log("=== RETURNING: ADVANCED TO NEXT TRACK ===");

      return res.json({
        success: true,
        action: "advanced",
        currentTrack: {
          id: nextTrack.$id,
          title: nextTrack.title,
          duration: nextTrack.duration,
          fileId: nextTrack.fileId,
          thumbnail: nextTrack.thumbnail,
          youtubeId: nextTrack.youtubeId,
          uploader: nextTrack.uploader,
          elapsedSeconds: 0,
          remainingSeconds: nextTrack.duration,
        },
      });
    }

    // Track still playing
    log("✓ Track still playing");
    const remainingSeconds = Math.max(
      0,
      currentTrack.duration - elapsedSeconds,
    );
    log(`  Remaining: ${remainingSeconds}s`);

    if (isApiRequest) {
      log("=== RETURNING: CURRENT TRACK STATE (API) ===");
      return res.json({
        success: true,
        currentTrack: {
          id: currentTrack.$id,
          title: currentTrack.title,
          duration: currentTrack.duration,
          fileId: currentTrack.fileId,
          thumbnail: currentTrack.thumbnail,
          youtubeId: currentTrack.youtubeId,
          uploader: currentTrack.uploader,
          elapsedSeconds: elapsedSeconds,
          remainingSeconds: remainingSeconds,
        },
      });
    }

    // Cron job: update elapsed time in database
    log("Cron job - updating elapsed time in database...");
    await databases.updateDocument(
      DATABASE_ID,
      STATE_COLLECTION_ID,
      STATE_DOCUMENT_ID,
      {
        elapsedSeconds: elapsedSeconds,
      },
    );

    log("✓ Elapsed time updated in database");
    log("=== RETURNING: UPDATED STATE (CRON) ===");

    return res.json({
      success: true,
      action: "updated",
      currentTrack: {
        id: currentTrack.$id,
        title: currentTrack.title,
        duration: currentTrack.duration,
        fileId: currentTrack.fileId,
        thumbnail: currentTrack.thumbnail,
        elapsedSeconds: elapsedSeconds,
      },
    });
  } catch (err) {
    error("=== ERROR IN TILAWAT TRACKER ===");
    error(`Error message: ${err.message}`);
    error(`Error stack: ${err.stack}`);
    return res.json(
      {
        success: false,
        error: err.message,
      },
      500,
    );
  }
};
