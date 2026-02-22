/**
 * Tilawat Tracker Function
 * - Runs every minute as a cron job to track and advance tracks
 * - Also serves as API endpoint for frontend polling (GET/POST requests)
 */

import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  const isApiRequest = req.method === "GET" || req.method === "POST";

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
      state = await databases.getDocument(
        DATABASE_ID,
        STATE_COLLECTION_ID,
        STATE_DOCUMENT_ID,
      );
    } catch (err) {
      // Initialize state if doesn't exist
      log("Initializing tilawat state...");
      const tilawats = await databases.listDocuments(
        DATABASE_ID,
        TILAWAT_COLLECTION_ID,
        [Query.orderAsc("$createdAt"), Query.limit(1)],
      );

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
    }

    // Calculate elapsed time since track started
    const startedAt = new Date(state.startedAt);
    const now = new Date();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);

    // Get current track details
    const currentTrack = await databases.getDocument(
      DATABASE_ID,
      TILAWAT_COLLECTION_ID,
      state.currentTrackId,
    );

    // If this is an API request, just return current state
    if (isApiRequest) {
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
          remainingSeconds: Math.max(0, currentTrack.duration - elapsedSeconds),
        },
      });
    }

    // Cron job logic: check if track has finished
    log(
      `Current track: ${currentTrack.title}, Elapsed: ${elapsedSeconds}s / ${currentTrack.duration}s`,
    );

    if (elapsedSeconds >= currentTrack.duration) {
      log("Track finished, advancing to next...");

      // Get all tracks ordered by creation date
      const allTracks = await databases.listDocuments(
        DATABASE_ID,
        TILAWAT_COLLECTION_ID,
        [Query.orderAsc("$createdAt"), Query.limit(500)],
      );

      // Find current track index
      const currentIndex = allTracks.documents.findIndex(
        (t) => t.$id === state.currentTrackId,
      );

      // Get next track (loop back to first if at end)
      const nextIndex = (currentIndex + 1) % allTracks.documents.length;
      const nextTrack = allTracks.documents[nextIndex];

      log(`Advancing to: ${nextTrack.title}`);

      // Update state with next track
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

      return res.json({
        success: true,
        action: "advanced",
        currentTrack: {
          id: nextTrack.$id,
          title: nextTrack.title,
          duration: nextTrack.duration,
          fileId: nextTrack.fileId,
          thumbnail: nextTrack.thumbnail,
          elapsedSeconds: 0,
        },
      });
    } else {
      // Update elapsed time
      await databases.updateDocument(
        DATABASE_ID,
        STATE_COLLECTION_ID,
        STATE_DOCUMENT_ID,
        {
          elapsedSeconds: elapsedSeconds,
        },
      );

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
    }
  } catch (err) {
    error(`Error in tilawat tracker: ${err.message}`);
    return res.json(
      {
        success: false,
        error: err.message,
      },
      500,
    );
  }
};
