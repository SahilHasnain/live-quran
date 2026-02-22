/**
 * Tilawat Player Context
 * Smart playback logic with backend state tracking
 * Polls backend every 10 seconds to check for track changes
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
  useRef,
  useState,
} from "react";

const APPWRITE_ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ||
  "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "";
const TRACKER_FUNCTION_ID =
  process.env.EXPO_PUBLIC_TILAWAT_TRACKER_FUNCTION_ID || "";
const APPWRITE_BUCKET_ID =
  process.env.EXPO_PUBLIC_APPWRITE_TILAWAT_BUCKET_ID || "";

const POLL_INTERVAL = 10000; // Poll every 10 seconds

interface TilawatTrack {
  id: string;
  title: string;
  duration: number;
  fileId: string;
  thumbnail: string | null;
  youtubeId: string;
  uploader: string | null;
  elapsedSeconds: number;
  remainingSeconds: number;
}

interface TilawatPlayerContextType {
  isPlaying: boolean;
  isLoading: boolean;
  error: Error | null;
  currentTrack: TilawatTrack | null;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
}

const TilawatPlayerContext = createContext<
  TilawatPlayerContextType | undefined
>(undefined);

export const TilawatPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TilawatTrack | null>(null);
  const [shouldBePlaying, setShouldBePlaying] = useState(false);
  const playbackState = usePlaybackState();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);

  const isPlaying = playbackState.state === State.Playing;

  // Get audio file URL from Appwrite with proper download parameter
  const getAudioUrl = useCallback((fileId: string) => {
    // Use download endpoint instead of view to get proper audio file with correct headers
    return `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`;
  }, []);

  // Fetch current state from backend
  const fetchCurrentState = useCallback(async () => {
    try {
      // Call the tracker function directly as an API endpoint
      const response = await fetch(TRACKER_FUNCTION_ID, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch state: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.currentTrack) {
        return data.currentTrack;
      }

      throw new Error("Failed to get valid state");
    } catch (err) {
      console.error("[TilawatPlayer] Error fetching state:", err);
      throw err;
    }
  }, []);

  // Load and play track
  const loadTrack = useCallback(
    async (track: TilawatTrack) => {
      try {
        console.log(`[TilawatPlayer] Loading track: ${track.title}`);

        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: track.id,
          url: getAudioUrl(track.fileId),
          title: track.title,
          artist: track.uploader || "Quran Recitation",
          artwork: track.thumbnail || require("../assets/images/icon.png"),
          duration: track.duration,
        });

        // Seek to elapsed position
        if (track.elapsedSeconds > 0) {
          await TrackPlayer.seekTo(track.elapsedSeconds);
        }

        setCurrentTrack(track);
        currentTrackIdRef.current = track.id;

        if (shouldBePlaying) {
          await TrackPlayer.play();
        }
      } catch (err) {
        console.error("[TilawatPlayer] Error loading track:", err);
        throw err;
      }
    },
    [getAudioUrl, shouldBePlaying],
  );

  // Poll backend for state changes
  const pollState = useCallback(async () => {
    try {
      const track = await fetchCurrentState();

      // Check if track changed
      if (track.id !== currentTrackIdRef.current) {
        console.log("[TilawatPlayer] Track changed, loading new track");
        await loadTrack(track);
      } else {
        // Update elapsed time
        setCurrentTrack((prev) =>
          prev ? { ...prev, elapsedSeconds: track.elapsedSeconds } : null,
        );
      }
    } catch (err) {
      console.error("[TilawatPlayer] Polling error:", err);
      setError(err as Error);
    }
  }, [fetchCurrentState, loadTrack]);

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
        console.log("[TilawatPlayer] Setup complete");

        // Load initial track
        const track = await fetchCurrentState();
        await loadTrack(track);
      } catch (err) {
        console.error("[TilawatPlayer] Setup error:", err);
        setError(err as Error);
      }
    };

    setup();

    return () => {
      TrackPlayer.reset();
    };
  }, []);

  // Start/stop polling based on playing state
  useEffect(() => {
    if (shouldBePlaying && isSetup) {
      // Start polling
      pollIntervalRef.current = setInterval(pollState, POLL_INTERVAL);
      console.log("[TilawatPlayer] Started polling");
    } else {
      // Stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        console.log("[TilawatPlayer] Stopped polling");
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [shouldBePlaying, isSetup, pollState]);

  const play = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isSetup) {
        throw new Error("Player not setup");
      }

      await TrackPlayer.play();
      setShouldBePlaying(true);
      console.log("[TilawatPlayer] Playing");
    } catch (err) {
      console.error("[TilawatPlayer] Play error:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [isSetup]);

  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
      setShouldBePlaying(false);
      console.log("[TilawatPlayer] Paused");
    } catch (err) {
      console.error("[TilawatPlayer] Pause error:", err);
      setError(err as Error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await TrackPlayer.stop();
      setShouldBePlaying(false);
      console.log("[TilawatPlayer] Stopped");
    } catch (err) {
      console.error("[TilawatPlayer] Stop error:", err);
      setError(err as Error);
    }
  }, []);

  return (
    <TilawatPlayerContext.Provider
      value={{
        isPlaying,
        isLoading,
        error,
        currentTrack,
        play,
        pause,
        stop,
      }}
    >
      {children}
    </TilawatPlayerContext.Provider>
  );
};

export const useTilawatPlayer = () => {
  const context = useContext(TilawatPlayerContext);
  if (!context) {
    throw new Error(
      "useTilawatPlayer must be used within TilawatPlayerProvider",
    );
  }
  return context;
};
