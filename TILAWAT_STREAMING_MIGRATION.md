# Tilawat Streaming Migration

## Overview

Migrated tilawat mode from polling-based Appwrite function approach to live streaming, matching the implementation of tafseer and translation modes.

## Changes Made

### 1. Environment Variables

Added `EXPO_PUBLIC_TILAWAT_STREAM_URL` to all environment files:

- `.env.local`: `https://livequran.duckdns.org/tilawat`
- `.env.example`: `https://livequran.duckdns.org/tilawat`
- `eas.json`: Added to all build profiles (development, preview, production)

Removed deprecated variables:
- `EXPO_PUBLIC_TILAWAT_TRACKER_FUNCTION_ID` (no longer needed)

### 2. TrackPlayerContext Simplification

**Removed:**
- All polling logic (`pollTilawatState`, `fetchTilawatState`, `POLL_INTERVAL`)
- Appwrite tracker function integration
- Track state synchronization logic
- Elapsed time tracking for live mode
- `pollIntervalRef`, `currentTrackIdRef`, `trackStartTimeRef` refs

**Simplified:**
- Tilawat now uses live streaming URL like tafseer and translation
- All three modes share the same streaming implementation
- Cleaner, more maintainable codebase

**Kept:**
- On-demand track playback from audio list (uses Appwrite storage)
- `playTrack()` function for playing specific tracks
- `currentTrack` state for on-demand playback

### 3. Updated Interface

```typescript
interface TilawatTrack {
  id: string;
  title: string;
  duration: number;
  fileId: string;
  thumbnail: string | null;
  youtubeId: string;
  uploader: string | null;
  // Removed: elapsedSeconds, remainingSeconds (not needed for streaming)
}
```

## How It Works Now

### Live Streaming Mode (Default)

When users select tilawat mode, they hear the live stream from `https://livequran.duckdns.org/tilawat`:

```typescript
// All modes now work the same way
const TILAWAT_STREAM_URL = "https://livequran.duckdns.org/tilawat";

await TrackPlayer.add({
  id: "live-stream",
  url: TILAWAT_STREAM_URL,
  title: "Quran Tilawat Radio",
  artist: "Quran Recitation",
  isLiveStream: true,
});
```

### On-Demand Playback (Audio List)

Users can still play specific tracks from the audio list:

```typescript
// Play specific track from Appwrite storage
await playTrack({
  id: "track-id",
  fileId: "appwrite-file-id",
  title: "Surah Al-Fatiha",
  // ... other track details
});
```

## Benefits

1. **Consistency**: All three modes (tafseer, tilawat, translation) now work identically
2. **Simplicity**: Removed ~200 lines of polling logic
3. **Performance**: No more periodic API calls every 10 seconds
4. **Reliability**: Live streaming is more stable than polling + file downloads
5. **Maintainability**: Single code path for all streaming modes

## Backend Requirements

The backend must stream audio to `https://livequran.duckdns.org/tilawat` using Icecast or similar streaming server (already configured based on docs).

## Files Deleted

- `contexts/TilawatPlayerContext.tsx` - Old polling-based context
- `functions/tilawat-tracker/` - Appwrite function for track state management
- `functions/package.json` - Function dependencies
- `TILAWAT_ANDROID_FIX.md` - Documentation for polling approach fixes
- `TILAWAT_SMART_PLAYBACK.md` - Documentation for smart playback with polling
- `TILAWAT_LIVE_RADIO_FIX.md` - Documentation for live radio polling fixes

## Migration Notes

- The old `TilawatPlayerContext.tsx` is now obsolete (can be deleted)
- The Appwrite tracker function is no longer called by the app
- Backend state collection is no longer needed for live streaming
- Audio list feature still requires Appwrite storage for on-demand playback

## Testing Checklist

- [ ] Tilawat live stream plays correctly
- [ ] Mode switching works (tafseer ↔ tilawat ↔ translation)
- [ ] On-demand track playback from audio list works
- [ ] Background playback continues when app is minimized
- [ ] Notification controls work (play/pause)
- [ ] No console errors related to polling or tracker function
