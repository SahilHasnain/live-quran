/**
 * Track Player Context
 * Uses react-native-track-player for reliable background audio streaming
 * Supports multiple modes: Tafseer and Tilawat
 */

import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
} from "@weights-ai/react-native-track-player";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type QuranMode = "tafseer" | "tilawat" | "translation";

const TAFSEER_STREAM_URL =
  process.env.EXPO_PUBLIC_TAFSEER_STREAM_URL ||
  "https://livequran.duckdns.org/stream";

const TILAWAT_STREAM_URL =
  process.env.EXPO_PUBLIC_TILAWAT_STREAM_URL ||
  "https://livequran.duckdns.org/tilawat";

const TRANSLATION_STREAM_URL =
  process.env.EXPO_PUBLIC_TRANSLATION_STREAM_URL ||
  "https://livequran.duckdns.org/translation";

interface TrackPlayerContextType {
  isPlaying: boolean;
  isLoading: boolean;
  error: Error | null;
  currentMode: QuranMode;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  switchMode: (mode: QuranMode) => Promise<void>;
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
  const [shouldBePlaying, setShouldBePlaying] = useState(false);
  const playbackState = usePlaybackState();

  const isPlaying = playbackState.state === State.Playing;

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
        return "Quran Tafseer Radio";
      case "tilawat":
        return "Quran Tilawat Radio";
      case "translation":
        return "Quran Translation Radio";
      default:
        return "Quran Tilawat Radio";
    }
  }, []);

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

        // Add the initial stream (Tilawat by default)
        await TrackPlayer.add({
          id: "live-stream",
          url: getStreamUrl("tilawat"),
          title: getStreamTitle("tilawat"),
          artist: "Quran Recitation",
          artwork: require("../assets/images/icon.png"),
          isLiveStream: true,
        });

        setIsSetup(true);
        console.log("[TrackPlayer] Setup complete");

        // Auto-play on mount
        await TrackPlayer.play();
        setShouldBePlaying(true);
        console.log("[TrackPlayer] Auto-play started");
      } catch (err) {
        console.error("[TrackPlayer] Setup error:", err);
        setError(err as Error);
      }
    };

    setup();

    return () => {
      TrackPlayer.reset();
    };
  }, [getStreamUrl, getStreamTitle]);

  // Auto-resume playback when stream reconnects after track change
  useEffect(() => {
    if (!isSetup || !shouldBePlaying) return;

    const checkAndResume = async () => {
      const state = await TrackPlayer.getState();

      // If we should be playing but we're not, try to resume
      if (
        state !== State.Playing &&
        state !== State.Buffering &&
        state !== State.Loading
      ) {
        console.log(`[TrackPlayer] Auto-resuming from state: ${state}`);
        try {
          await TrackPlayer.play();
        } catch (err) {
          console.error("[TrackPlayer] Auto-resume error:", err);
        }
      }
    };

    // Check every 2 seconds if we need to resume
    const interval = setInterval(checkAndResume, 2000);

    return () => clearInterval(interval);
  }, [isSetup, shouldBePlaying]);

  const play = useCallback(async () => {
    if (!isSetup) {
      console.warn("[TrackPlayer] Not setup yet");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await TrackPlayer.play();
      setShouldBePlaying(true);
      setIsLoading(false);
    } catch (err) {
      console.error("[TrackPlayer] Play error:", err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [isSetup]);

  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
      setShouldBePlaying(false);
    } catch (err) {
      console.error("[TrackPlayer] Pause error:", err);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await TrackPlayer.stop();
      setShouldBePlaying(false);
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

        // Stop current playback
        await TrackPlayer.stop();

        // Reset the queue
        await TrackPlayer.reset();

        // Add new track with new stream URL
        await TrackPlayer.add({
          id: "live-stream",
          url: getStreamUrl(mode),
          title: getStreamTitle(mode),
          artist: "Quran Recitation",
          artwork: require("../assets/images/icon.png"),
          isLiveStream: true,
        });

        // Update mode
        setCurrentMode(mode);

        // Start playing new stream
        await TrackPlayer.play();
        setShouldBePlaying(true);

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

  const value: TrackPlayerContextType = {
    isPlaying,
    isLoading,
    error,
    currentMode,
    play,
    pause,
    stop,
    switchMode,
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
