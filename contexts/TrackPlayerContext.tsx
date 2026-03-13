/**
 * Track Player Context
 * Uses react-native-track-player for reliable background audio streaming
 * Supports multiple modes: Tafseer, Tilawat, and Translation (all live streaming)
 */

import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
} from "@weights-ai/react-native-track-player";
import * as SplashScreen from "expo-splash-screen";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Keep splash screen visible until first audio is ready
SplashScreen.preventAutoHideAsync();

export type QuranMode = "tafseer" | "tilawat" | "translation";

const TAFSEER_STREAM_URL = "http://livequran.duckdns.org:8000/tafseer";
const TILAWAT_STREAM_URL = "http://livequran.duckdns.org:8001/tilawat";
const TRANSLATION_STREAM_URL = "http://livequran.duckdns.org:8002/translation";

// Appwrite config for audio list feature
const APPWRITE_ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ||
  "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "";
const APPWRITE_BUCKET_ID =
  process.env.EXPO_PUBLIC_APPWRITE_TILAWAT_BUCKET_ID || "";

interface TilawatTrack {
  id: string;
  title: string;
  duration: number;
  fileId: string;
  thumbnail: string | null;
  youtubeId: string;
  uploader: string | null;
}

interface TrackPlayerContextType {
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  error: Error | null;
  currentMode: QuranMode;
  currentTrack: TilawatTrack | null; // Only populated when playing on-demand track
  isInitialLoad: boolean;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  switchMode: (mode: QuranMode) => Promise<void>;
  playTrack: (track: TilawatTrack) => Promise<void>;
}

const TrackPlayerContext = createContext<TrackPlayerContextType | undefined>(
  undefined,
);

export const TrackPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [currentMode, setCurrentMode] = useState<QuranMode>("tilawat");
  const [currentTrack, setCurrentTrack] = useState<TilawatTrack | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const playbackState = usePlaybackState();
  const splashHiddenRef = useRef(false);

  const isPlaying = playbackState.state === State.Playing;
  const isBuffering = playbackState.state === State.Buffering;

  // Get stream URL based on current mode
  const getStreamUrl = useCallback((mode: QuranMode) => {
    switch (mode) {
      case "tafseer":
        return TAFSEER_STREAM_URL;
      case "tilawat":
        return TILAWAT_STREAM_URL;
      case "translation":
        return TRANSLATION_STREAM_URL;
      default:
        return TILAWAT_STREAM_URL;
    }
  }, []);

  // Get stream title based on current mode
  const getStreamTitle = useCallback((mode: QuranMode) => {
    switch (mode) {
      case "tafseer":
        return "Tafseer Radio";
      case "tilawat":
        return "Tilawat Radio";
      case "translation":
        return "Translation Radio";
      default:
        return "Tilawat Radio";
    }
  }, []);

  // Get audio file URL from Appwrite (for on-demand playback)
  const getAudioUrl = useCallback((fileId: string) => {
    return `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`;
  }, []);

  // Hide splash screen once audio is ready to play
  useEffect(() => {
    const hideSplash = async () => {
      if (
        !splashHiddenRef.current &&
        isSetup &&
        !isLoading &&
        (isPlaying || error)
      ) {
        try {
          await SplashScreen.hideAsync();
          splashHiddenRef.current = true;
          setIsInitialLoad(false);
          console.log("[TrackPlayer] Splash screen hidden - audio ready");
        } catch (err) {
          console.warn("[TrackPlayer] Error hiding splash:", err);
        }
      }
    };

    hideSplash();
  }, [isSetup, isLoading, isPlaying, error]);

  // Setup TrackPlayer
  useEffect(() => {
    const setup = async () => {
      try {
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
        });

        await TrackPlayer.updateOptions({
          capabilities: [Capability.Play, Capability.Pause],
          compactCapabilities: [Capability.Play, Capability.Pause],
          notificationCapabilities: [Capability.Play, Capability.Pause],
        });

        setIsSetup(true);
        console.log("[TrackPlayer] Setup complete");

        // Add the initial stream
        await TrackPlayer.add({
          id: "live-stream",
          url: getStreamUrl(currentMode),
          title: getStreamTitle(currentMode),
          artwork: require("../assets/images/icon.png"),
          isLiveStream: true,
        });

        // Auto-play on mount
        await TrackPlayer.play();
        console.log("[TrackPlayer] Auto-play started");
      } catch (err) {
        console.error("[TrackPlayer] Setup error:", err);
        setError(err as Error);
        // Hide splash even on error so user can see error message
        if (!splashHiddenRef.current) {
          try {
            await SplashScreen.hideAsync();
            splashHiddenRef.current = true;
          } catch (splashErr) {
            console.warn("[TrackPlayer] Error hiding splash:", splashErr);
          }
        }
      }
    };

    setup();

    return () => {
      TrackPlayer.reset();
    };
  }, []);

  const play = useCallback(async () => {
    if (!isSetup) {
      console.warn("[TrackPlayer] Not setup yet");
      return;
    }

    try {
      setError(null);
      await TrackPlayer.play();
      console.log("[TrackPlayer] Play called");
    } catch (err) {
      console.error("[TrackPlayer] Play error:", err);
      setError(err as Error);
    }
  }, [isSetup]);

  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
      console.log("[TrackPlayer] Pause called");
    } catch (err) {
      console.error("[TrackPlayer] Pause error:", err);
      setError(err as Error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await TrackPlayer.stop();
      console.log("[TrackPlayer] Stop called");
    } catch (err) {
      console.error("[TrackPlayer] Stop error:", err);
    }
  }, []);

  const switchMode = useCallback(
    async (mode: QuranMode) => {
      if (mode === currentMode) return;

      try {
        setIsLoading(true);
        setError(null);
        const startTime = Date.now();

        // Stop current playback
        await TrackPlayer.stop();

        // Reset the queue
        await TrackPlayer.reset();

        // Clear on-demand track if any
        setCurrentTrack(null);

        // Update mode
        setCurrentMode(mode);

        // Add new stream
        await TrackPlayer.add({
          id: "live-stream",
          url: getStreamUrl(mode),
          title: getStreamTitle(mode),
          artwork: require("../assets/images/icon.png"),
          isLiveStream: true,
        });

        // Start playing new stream
        await TrackPlayer.play();

        // Ensure minimum loading duration for smooth UX
        const elapsed = Date.now() - startTime;
        const minDuration = 800;
        if (elapsed < minDuration) {
          await new Promise((resolve) =>
            setTimeout(resolve, minDuration - elapsed),
          );
        }

        console.log(`[TrackPlayer] Switched to ${mode} mode`);
        setIsLoading(false);
      } catch (err) {
        console.error("[TrackPlayer] Mode switch error:", err);
        setError(err as Error);
        setIsLoading(false);
      }
    },
    [currentMode, getStreamUrl, getStreamTitle],
  );

  // Play a specific track on demand (from audio list)
  const playTrack = useCallback(
    async (track: TilawatTrack) => {
      try {
        setIsLoading(true);
        setError(null);

        // Switch to tilawat mode if not already
        setCurrentMode("tilawat");

        await TrackPlayer.reset();
        
        // Check if fileId is a local file path (starts with file://)
        const isLocalFile = track.fileId.startsWith('file://');
        const audioUrl = isLocalFile ? track.fileId : getAudioUrl(track.fileId);
        
        await TrackPlayer.add({
          id: track.id,
          url: audioUrl,
          title: track.title,
          artwork: track.thumbnail || require("../assets/images/icon.png"),
          duration: track.duration,
        });

        await TrackPlayer.seekTo(0);
        setCurrentTrack(track);

        await TrackPlayer.play();
        setIsLoading(false);
      } catch (err) {
        console.error("[TrackPlayer] playTrack error:", err);
        setError(err as Error);
        setIsLoading(false);
      }
    },
    [getAudioUrl],
  );

  const value: TrackPlayerContextType = {
    isPlaying,
    isBuffering,
    isLoading,
    error,
    currentMode,
    currentTrack,
    isInitialLoad,
    play,
    pause,
    stop,
    switchMode,
    playTrack,
  };

  return (
    <TrackPlayerContext.Provider value={value}>
      {children}
    </TrackPlayerContext.Provider>
  );
};

export const useTrackPlayer = () => {
  const context = useContext(TrackPlayerContext);
  if (context === undefined) {
    throw new Error("useTrackPlayer must be used within TrackPlayerProvider");
  }
  return context;
};
