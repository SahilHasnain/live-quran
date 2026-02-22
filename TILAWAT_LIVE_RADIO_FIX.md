# Tilawat Live Radio Behavior Fix

## Problem

The tilawat mode was not behaving like a live radio:

1. Only one track would play and then stop
2. Tracks wouldn't advance automatically
3. The backend only advanced tracks when the cron job ran (every 60 seconds)
4. Frontend polling every 10 seconds wasn't triggering track advancement

## Root Cause

The backend function had two separate code paths:

- **API requests (frontend polling)**: Just returned current state without checking if track finished
- **Cron job**: Checked if track finished and advanced to next

This meant the frontend could poll 6 times while waiting for the cron to advance the track.

## Solution

### Backend Changes (`functions/tilawat-tracker/src/main.js`)

Unified the logic so BOTH API requests and cron jobs check if the track has finished:

```javascript
// Check if track has finished (for both API and cron)
if (elapsedSeconds >= currentTrack.duration) {
  // Advance to next track immediately
  // Update database
  // Return next track info
}

// Track still playing
if (isApiRequest) {
  // Return current state
}

// Cron job: update elapsed time in database
```

Now when the frontend polls and the track has finished, it immediately gets the next track.

### Frontend Changes (`contexts/TrackPlayerContext.tsx`)

1. **Removed position syncing**: Frontend doesn't try to sync playback position with backend elapsed time
2. **Start from beginning**: When loading a track, always start from position 0 (not from elapsed seconds)
3. **Local elapsed time tracking**: Track elapsed time locally for smooth UI updates (display only)
4. **Simple polling logic**: Just check if track ID changed, if yes, load new track

```typescript
// When track changes, load it from the beginning
await TrackPlayer.seekTo(0);

// Track local start time for UI display
trackStartTimeRef.current = Date.now();

// Update UI every second (doesn't affect playback)
const elapsedMs = Date.now() - trackStartTimeRef.current;
const elapsedSeconds = Math.floor(elapsedMs / 1000);
```

## How It Works Now

1. **Backend tracks global state**: One track playing for everyone, advances when duration is reached
2. **Frontend polls every 10 seconds**: Checks if track ID changed
3. **Track changes detected**: Frontend loads new track from beginning
4. **Continuous playback**: Tracks advance automatically, behaving like a live radio

## Trade-offs

- Users joining mid-track will hear from the beginning until the next track starts
- This is acceptable and mentioned in the requirements
- Benefit: Simple, reliable, truly synchronized across all users

## Testing

1. Start tilawat mode
2. Wait for first track to finish (check duration in UI)
3. Within 10 seconds, next track should load automatically
4. Verify continuous playback through multiple tracks
5. Check that track info updates in UI

## Files Modified

- `functions/tilawat-tracker/src/main.js` - Unified track advancement logic
- `contexts/TrackPlayerContext.tsx` - Simplified polling, removed position syncing
- `app/index.tsx` - Added track info display for tilawat mode
