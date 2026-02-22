# Live Quran Radio

24/7 Live Quran streaming app built with React Native and Expo.

## Features

- ✅ 24/7 live audio streaming
- ✅ Background playback (works with screen off)
- ✅ Lock screen controls
- ✅ Notification controls
- ✅ Bluetooth/headphone controls
- ✅ No timeout - plays indefinitely
- ✅ Auto-reconnect on network issues

## Tech Stack

- **React Native** - Mobile framework
- **Expo SDK 54** - Development platform
- **react-native-track-player** - Audio streaming
- **NativeWind** - Styling
- **Appwrite** - Backend (for server management)

## Project Structure

```
├── app/
│   ├── _layout.tsx          # Root layout with TrackPlayerProvider
│   └── index.tsx            # Main radio player screen
├── contexts/
│   └── TrackPlayerContext.tsx  # Audio player state management
├── services/
│   └── trackPlayerService.ts   # Playback event handlers
├── assets/
│   └── images/              # App icons and images
├── index.js                 # Entry point with service registration
└── App.tsx                  # Expo router entry
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
EXPO_PUBLIC_ICECAST_STREAM_URL=https://your-stream-url.com/stream
```

### 3. Build the App

For development:

```bash
npm run build:dev
```

For production:

```bash
npm run build:preview
```

## Development

### Start Development Server

```bash
npm start
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

## How It Works

### Audio Streaming

The app uses `react-native-track-player` which:

- Creates a foreground service on Android (persistent notification)
- Enables background audio mode on iOS
- Handles network interruptions automatically
- Provides native lock screen controls
- Prevents system from killing the audio

### Architecture

```
Stream URL → TrackPlayer → Native Audio Player → Speakers
                ↓
         Lock Screen Controls
         Notification Controls
         Bluetooth Controls
```

## Configuration

### Change Stream URL

Update in `.env.local`:

```env
EXPO_PUBLIC_ICECAST_STREAM_URL=your-new-url
```

### Customize Metadata

Edit `contexts/TrackPlayerContext.tsx`:

```tsx
await TrackPlayer.add({
  id: "live-stream",
  url: STREAM_URL,
  title: "Your Radio Name",
  artist: "Your Artist",
  artwork: require("../assets/images/icon.png"),
  isLiveStream: true,
});
```

### Modify Controls

Edit `services/trackPlayerService.ts` to handle different playback events.

## Troubleshooting

### Audio stops after some time

- Ensure you rebuilt the app after installing react-native-track-player
- Check Android permissions include FOREGROUND_SERVICE_MEDIA_PLAYBACK
- Verify iOS background modes include "audio"

### No lock screen controls

- Only works on physical devices (not simulators)
- Requires native build (won't work in Expo Go)

### Build fails

- Run: `npx expo prebuild --clean`
- Delete node_modules: `rm -rf node_modules && npm install`

## Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run build:dev` - Build development APK
- `npm run build:preview` - Build preview APK
- `npm run lint` - Run ESLint

## Server Setup

See `LIVE_RADIO_SETUP.md` for details on the Icecast streaming server setup.

## License

Private
