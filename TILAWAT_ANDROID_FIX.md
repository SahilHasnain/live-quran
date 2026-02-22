# Tilawat Android Parsing Error Fix

## Problem

After migrating tilawat to a polling-based approach, Android was throwing a playback error:

```
android-parsing-container-unsupported
```

This error only occurred in tilawat mode, not in tafseer or translation modes.

## Root Cause

The issue had two main causes:

1. **Wrong API endpoint**: The code was trying to call `GET_STATE_FUNCTION_ID` which didn't exist - it should have been `TRACKER_FUNCTION_ID`

2. **HLS streaming URL**: The app was still trying to use the HLS stream URL (`https://livequran.duckdns.org/hls/tilawat/playlist.m3u8`) instead of direct audio file URLs from Appwrite storage

3. **Wrong Appwrite endpoint**: Using `/view` instead of `/download` for audio files, which caused Android to receive incorrect content-type headers

## Solution

### 1. Unified TrackPlayerContext

Merged the polling-based tilawat logic from `TilawatPlayerContext` into the main `TrackPlayerContext` so all modes work seamlessly:

- **Tafseer & Translation**: Use live streaming URLs (existing behavior)
- **Tilawat**: Use polling-based playback with direct audio file downloads

### 2. Fixed API Calls

Changed from complex Appwrite function execution polling to direct function URL calls:

```typescript
// Before (broken)
const response = await fetch(
  `${APPWRITE_ENDPOINT}/functions/${GET_STATE_FUNCTION_ID}/executions`,
  { method: "POST" },
);

// After (working)
const response = await fetch(TRACKER_FUNCTION_ID, {
  method: "GET",
});
```

### 3. Fixed Audio URL Generation

Changed from `/view` to `/download` endpoint to get proper audio file headers:

```typescript
// Before (caused parsing error)
return `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;

// After (working)
return `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`;
```

### 4. Removed HLS URL

Removed the problematic HLS streaming URL from `.env.local` since tilawat now uses direct file playback.

## How It Works Now

### Tilawat Mode (Polling-Based)

1. On mode switch to tilawat, fetch current track state from backend
2. Download audio file directly from Appwrite storage using `/download` endpoint
3. Seek to the correct elapsed position
4. Start playback
5. Poll every 10 seconds for track changes
6. When track changes, load new audio file and continue playback

### Tafseer & Translation Modes (Streaming)

1. Use live streaming URLs as before
2. No polling needed
3. Continuous stream playback

## Files Changed

- `contexts/TrackPlayerContext.tsx` - Merged tilawat polling logic, fixed API calls and audio URLs
- `.env.local` - Removed HLS streaming URL for tilawat
- `contexts/TilawatPlayerContext.tsx` - Can now be deprecated (logic merged into TrackPlayerContext)

## Testing

To verify the fix:

1. Build and run the app on Android
2. Switch to Tilawat mode
3. Verify audio plays without parsing errors
4. Check that tracks advance automatically every ~10 seconds (based on backend state)
5. Switch to Tafseer/Translation modes to verify they still work

## Benefits

- No more Android parsing errors
- Better audio quality (direct file download vs streaming)
- Unified codebase (one context for all modes)
- Proper content-type headers from Appwrite
- Synchronized playback across all users
