# React Native Track Player - Common Mistakes & Fixes

This document outlines fundamental mistakes when implementing react-native-track-player and how to fix them.

## Problem 1: Notification Buttons Not Working

### Symptoms

- Play/pause buttons in the Android notification don't respond
- Tapping notification controls does nothing
- Console shows no errors

### Root Cause

The `PlaybackService` function has issues with event listener setup:

1. **Duplicate event listeners** - Registering the same event twice
2. **Overly complex async handlers** - Unnecessary async/await in event callbacks
3. **Redundant try-catch blocks** - Adding complexity without benefit

### Wrong Implementation ❌

```typescript
export async function PlaybackService() {
  // MISTAKE 1: Async handlers with try-catch
  const handleRemotePlay = async () => {
    console.log("[TrackPlayer] RemotePlay event");
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.error("[TrackPlayer] RemotePlay error:", error);
    }
  };

  const handleRemotePause = async () => {
    console.log("[TrackPlayer] RemotePause event");
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error("[TrackPlayer] RemotePause error:", error);
    }
  };

  // MISTAKE 2: Duplicate listeners (enum + string)
  TrackPlayer.addEventListener(Event.RemotePlay, handleRemotePlay);
  TrackPlayer.addEventListener("remote-play" as any, handleRemotePlay);

  TrackPlayer.addEventListener(Event.RemotePause, handleRemotePause);
  TrackPlayer.addEventListener("remote-pause" as any, handleRemotePause);
}
```

### Correct Implementation ✅

```typescript
export async function PlaybackService() {
  // Simple, synchronous event handlers
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.pause(); // Or stop, depending on your needs
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    // Handle next track if needed
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    // Handle previous track if needed
  });
}
```

### Why This Works

- **Single registration** - Each event is registered once with the Event enum
- **Synchronous handlers** - TrackPlayer methods don't need to be awaited in event callbacks
- **No unnecessary complexity** - Simple, direct calls to TrackPlayer methods

---

## Problem 2: "Player Not Initialized" Error

### Symptoms

```
ERROR [AudioContext] Error loading audio:
[Error: The player is not initialized. Call setupPlayer first.]
```

### Root Cause

Race condition: `loadAndPlay()` is called before `setupPlayer()` completes.

The setup happens in a `useEffect`, but there's no mechanism to wait for it to finish before allowing playback operations.

### Wrong Implementation ❌

```typescript
const isSetupRef = useRef(false);

// Setup Track Player on mount
useEffect(() => {
  const initPlayer = async () => {
    if (isSetupRef.current) return; // Only prevents duplicate setup

    try {
      await setupPlayer();
      isSetupRef.current = true;
      console.log("[AudioContext] Track Player initialized");
    } catch (err) {
      console.error("[AudioContext] Error initializing Track Player:", err);
    }
  };

  initPlayer();
}, []);

// Load and play audio
const loadAndPlay = useCallback(async (audio: AudioMetadata) => {
  // MISTAKE: No check if setup is complete!
  // This can run before setupPlayer() finishes

  try {
    await TrackPlayer.reset(); // ❌ Crashes if setup not done
    await TrackPlayer.add({
      /* ... */
    });
    await TrackPlayer.play();
  } catch (err) {
    console.error("[AudioContext] Error loading audio:", err);
  }
}, []);
```

### Correct Implementation ✅

```typescript
const isSetupRef = useRef(false);
const setupPromiseRef = useRef<Promise<void> | null>(null);

// Setup Track Player on mount
useEffect(() => {
  const initPlayer = async () => {
    if (isSetupRef.current || setupPromiseRef.current) return;

    // Store the setup promise so other code can await it
    setupPromiseRef.current = (async () => {
      try {
        console.log("[AudioContext] Initializing Track Player...");
        await setupPlayer();
        isSetupRef.current = true;
        console.log("[AudioContext] Track Player initialized");
      } catch (err) {
        console.error("[AudioContext] Error initializing Track Player:", err);
        setupPromiseRef.current = null; // Allow retry on error
      }
    })();

    await setupPromiseRef.current;
  };

  initPlayer();
}, []);

// Load and play audio
const loadAndPlay = useCallback(
  async (audio: AudioMetadata) => {
    if (isLoadingRef.current) {
      console.log("[AudioContext] Already loading audio, ignoring request");
      return;
    }

    // ✅ Wait for setup to complete
    if (setupPromiseRef.current) {
      console.log("[AudioContext] Waiting for Track Player setup...");
      await setupPromiseRef.current;
    }

    // ✅ Verify setup succeeded
    if (!isSetupRef.current) {
      console.error("[AudioContext] Track Player not initialized");
      setError(new Error("Track Player not initialized"));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("[AudioContext] Loading audio:", audio.title);

      await TrackPlayer.reset();
      await TrackPlayer.add({
        url: audio.audioUrl,
        title: audio.title,
        artist: audio.channelName,
        artwork: audio.thumbnailUrl,
      });

      await TrackPlayer.setVolume(volume);
      await TrackPlayer.play();

      setIsLoading(false);
      setIsPlaying(true);
    } catch (err) {
      console.error("[AudioContext] Error loading audio:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  },
  [volume],
);
```

### Why This Works

- **Promise tracking** - `setupPromiseRef` stores the setup promise
- **Explicit waiting** - `loadAndPlay` awaits the setup promise before proceeding
- **Error recovery** - If setup fails, the promise ref is cleared to allow retry
- **Validation** - Checks `isSetupRef.current` to ensure setup actually succeeded

---

## Problem 3: Entry Point Configuration

### Symptoms

- App crashes on launch with component import errors
- "Element type is invalid" errors
- DevTools wrapper errors

### Root Cause

Incorrect entry point setup when using expo-router with TrackPlayer service registration.

### Wrong Implementation ❌

```javascript
// index.js
import TrackPlayer from "@weights-ai/react-native-track-player";
import { registerRootComponent } from "expo";
import App from "./App"; // ❌ Wrong with expo-router
import { PlaybackService } from "./services/trackPlayerService";

TrackPlayer.registerPlaybackService(() => PlaybackService);

// ❌ This doesn't work with expo-router
registerRootComponent(App);
```

### Correct Implementation ✅

```javascript
// index.js
import TrackPlayer from "@weights-ai/react-native-track-player";
import { PlaybackService } from "./services/trackPlayerService";

// Register the playback service before app loads
TrackPlayer.registerPlaybackService(() => PlaybackService);

// Import expo-router entry (not dynamic import!)
import "expo-router/entry";
```

### Why This Works

- **No App import** - expo-router handles the root component automatically
- **Service first** - TrackPlayer service is registered before the app loads
- **Static import** - Uses static import, not dynamic `import()` which doesn't work for entry points

---

## Problem 4: Capability Configuration

### Symptoms

- Unwanted buttons in notification (like Stop)
- Notification doesn't show expected controls

### Root Cause

Incorrect capability configuration in `setupPlayer()` or `updateOptions()`.

### Wrong Implementation ❌

```typescript
await TrackPlayer.updateOptions({
  // MISTAKE: Including capabilities you don't want
  capabilities: [
    Capability.Play,
    Capability.Pause,
    Capability.Stop, // ❌ Shows stop button
    Capability.SeekTo, // ❌ May not work for live streams
  ],
  notificationCapabilities: [
    Capability.Play,
    Capability.Pause,
    Capability.Stop, // ❌ Stop button in notification
  ],
  compactCapabilities: [Capability.Play, Capability.Pause],
});
```

### Correct Implementation ✅

```typescript
await TrackPlayer.updateOptions({
  // Only include capabilities you actually want
  capabilities: [Capability.Play, Capability.Pause],
  compactCapabilities: [Capability.Play, Capability.Pause],
  notificationCapabilities: [Capability.Play, Capability.Pause],
});
```

### Why This Works

- **Minimal capabilities** - Only include what you need
- **Consistent across all fields** - Same capabilities in all three arrays
- **No stop button** - Removed `Capability.Stop` to hide the stop button

---

## Summary Checklist

When implementing react-native-track-player, ensure:

- [ ] PlaybackService uses simple, synchronous event handlers
- [ ] No duplicate event listener registrations
- [ ] Setup promise is tracked and awaited before any TrackPlayer operations
- [ ] Entry point uses static import of "expo-router/entry" (not dynamic)
- [ ] Service registration happens before app loads
- [ ] Capabilities are minimal and consistent across all configuration fields
- [ ] Error handling doesn't add unnecessary complexity

---

## Testing Your Implementation

### 1. Test Notification Controls

- Play audio
- Open notification drawer
- Tap play/pause buttons
- Verify they respond immediately

### 2. Test Race Conditions

- Clear app data
- Launch app
- Immediately try to play audio
- Should not crash with "not initialized" error

### 3. Test Entry Point

- Kill app completely
- Relaunch
- Should load without component errors

If all three tests pass, your implementation is correct!
