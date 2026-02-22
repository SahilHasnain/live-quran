# React Native Track Player Setup

## What We Did

1. **Installed react-native-track-player**

   ```bash
   npm install react-native-track-player
   ```

2. **Updated app.json**
   - Added iOS background audio mode
   - Added Android foreground service permissions

3. **Created Files**
   - `services/trackPlayerService.ts` - Handles playback events
   - `contexts/TrackPlayerContext.tsx` - React context for track player
   - `index.js` - Registers the playback service
   - `App.tsx` - Entry point wrapper

## How to Use

### 1. Update your \_layout.tsx

Replace the current provider with TrackPlayerProvider:

```tsx
import { TrackPlayerProvider } from "@/contexts/TrackPlayerContext";

export default function RootLayout() {
  return (
    <TrackPlayerProvider>
      <Stack>
        <Stack.Screen name="index" />
      </Stack>
    </TrackPlayerProvider>
  );
}
```

### 2. Use in Components

```tsx
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";

function RadioPlayer() {
  const { isPlaying, isLoading, play, pause, stop } = useTrackPlayer();

  return (
    <View>
      <Button onPress={isPlaying ? pause : play} disabled={isLoading}>
        {isPlaying ? "Pause" : "Play"}
      </Button>
    </View>
  );
}
```

## Build the App

Since react-native-track-player is a native module, you need to create a development build:

### For Android:

```bash
npm run build:dev
```

### For iOS (on Mac):

```bash
eas build --platform ios --profile development
```

## Why This Works

1. **Foreground Service**: Android keeps the app alive with a persistent notification
2. **Background Audio**: iOS allows audio to continue in background
3. **Native Implementation**: Uses platform-specific audio players (ExoPlayer on Android, AVPlayer on iOS)
4. **Lock Screen Controls**: Automatic media controls on lock screen and notification
5. **Designed for Streaming**: Handles network interruptions and reconnections

## Features

- ✅ Plays indefinitely without stopping
- ✅ Lock screen controls
- ✅ Notification controls
- ✅ Bluetooth/headphone controls
- ✅ Handles network interruptions
- ✅ Battery efficient
- ✅ Works with screen off
- ✅ Survives app backgrounding

## Troubleshooting

### "Player doesn't exist" error

- Make sure you rebuilt the app after installing
- Check that the playback service is registered in index.js

### Audio stops after 1 hour

- Verify Android permissions include FOREGROUND_SERVICE_MEDIA_PLAYBACK
- Check iOS background modes include "audio"
- Ensure you're testing on a physical device, not simulator

### No lock screen controls

- Only works on physical devices
- Requires native build (won't work in Expo Go)
- Make sure capabilities are set in TrackPlayerContext

### Build fails

- Run: `npx expo prebuild --clean`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Make sure you're using Expo SDK 54

## Testing

1. Build and install the app on a physical device
2. Start playing the stream
3. Lock the screen - audio should continue
4. Check lock screen for controls
5. Leave it playing for 2+ hours to verify it doesn't stop

## Configuration Options

You can customize the player in `contexts/TrackPlayerContext.tsx`:

```tsx
// Change stream URL
const STREAM_URL = "your-stream-url";

// Change metadata
await TrackPlayer.add({
  id: "live-stream",
  url: STREAM_URL,
  title: "Your Radio Name",
  artist: "Your Artist",
  artwork: require("../assets/images/your-icon.png"),
  isLiveStream: true,
});

// Change capabilities
await TrackPlayer.updateOptions({
  capabilities: [
    Capability.Play,
    Capability.Pause,
    Capability.Stop,
    Capability.SeekTo, // Add if needed
  ],
});
```

## Next Steps

1. Update `app/_layout.tsx` to use `TrackPlayerProvider`
2. Update your UI components to use `useTrackPlayer()`
3. Build the app: `npm run build:dev`
4. Install on device and test
5. Monitor for 2+ hours to ensure stability
