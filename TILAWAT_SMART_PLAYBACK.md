# Tilawat Smart Playback Setup

## Overview

Tilawat mode now uses smart backend-driven playback instead of URL streaming. The system tracks which audio is currently playing and advances through the playlist automatically.

## Architecture

```
Appwrite Cron Function (runs every minute)
    ↓
Tracks elapsed time & advances tracks
    ↓
Stores state in Appwrite collection
    ↓
Frontend polls every 10 seconds
    ↓
Loads correct audio file & seeks to position
```

## Setup Steps

### 1. Create State Collection

Run the script to create the Tilawat State collection:

```bash
node scripts/create-tilawat-state-collection.js
```

This creates a collection with:

- `currentTrackId` - ID of currently playing track
- `startedAt` - When current track started
- `elapsedSeconds` - Seconds elapsed in current track

### 2. Deploy Appwrite Functions

Deploy both functions to your Appwrite project:

**Tilawat Tracker (Cron Job)**

- Path: `functions/tilawat-tracker/`
- Schedule: `*/1 * * * *` (every minute)
- Purpose: Tracks time and advances tracks

**Get Tilawat State (API)**

- Path: `functions/get-tilawat-state/`
- Purpose: Returns current state for frontend polling

Configure environment variables for both functions:

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_TILAWAT_COLLECTION_ID`
- `APPWRITE_STATE_COLLECTION_ID`

### 3. Update Frontend Environment

Add to `.env.local`:

```env
# Appwrite public config
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
EXPO_PUBLIC_APPWRITE_TILAWAT_BUCKET_ID=your_bucket_id
EXPO_PUBLIC_TILAWAT_TRACKER_FUNCTION_ID=your_function_id
```

### 4. Update App Layout

Replace `TrackPlayerProvider` with mode-specific providers in `app/_layout.tsx`:

```tsx
import { TilawatPlayerProvider } from "@/contexts/TilawatPlayerContext";
import { TrackPlayerProvider } from "@/contexts/TrackPlayerContext";

// Wrap with both providers
<TilawatPlayerProvider>
  <TrackPlayerProvider>{/* Your app */}</TrackPlayerProvider>
</TilawatPlayerProvider>;
```

### 5. Update UI Components

Use `useTilawatPlayer()` for tilawat mode instead of `useTrackPlayer()`:

```tsx
import { useTilawatPlayer } from "@/contexts/TilawatPlayerContext";

const { isPlaying, currentTrack, play, pause } = useTilawatPlayer();

// Display current track info
<Text>{currentTrack?.title}</Text>
<Text>{currentTrack?.elapsedSeconds}s / {currentTrack?.duration}s</Text>
```

## How It Works

1. **Single Function** handles both:
   - **Cron execution** (every minute): Calculates elapsed time, advances tracks when finished
   - **API requests** (from frontend): Returns current track state immediately

2. **Frontend** polls every 10 seconds:
   - Calls the function as API endpoint
   - Gets current track and elapsed time
   - If track changed, loads new audio file
   - Seeks to correct position in the track
   - Continues playback seamlessly

3. **All users** hear the same audio at the same time (synchronized playback)

## Benefits

- No streaming server needed for tilawat
- Reduced bandwidth costs
- Better audio quality (direct file playback)
- Synchronized playback across all users
- Automatic track advancement
- Resilient to network issues (polling retries)

## Monitoring

Check function logs in Appwrite console:

- Tilawat Tracker: Shows track changes and elapsed time
- Get State: Shows polling requests from clients

## Troubleshooting

**Tracks not advancing:**

- Check cron job is running (Appwrite Functions console)
- Verify state collection has correct permissions
- Check function logs for errors

**Frontend not updating:**

- Verify function ID is correct in .env.local
- Check network requests in browser/app debugger
- Ensure polling interval is active (only when playing)

**Audio not playing:**

- Verify bucket ID and file IDs are correct
- Check Appwrite storage permissions
- Ensure audio files are uploaded correctly
