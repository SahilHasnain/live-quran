/**
 * Track Player Context
 * Uses react-native-track-player for reliable background audio streaming
 * Supports multiple modes: Tafseer, Tilawat (polling-based), and Translation
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

const TAFSEER_STREAM_URL =
  process.env.EXPO_PUBLIC_TAFSEER_STREAM_URL ||
  "https://livequran.duckdns.org/stream";

const TRANSLATION_STREAM_URL =
  process.env.EXPO_PUBLIC_TRANSLATION_STREAM_URL ||
  "https://livequran.duckdns.org/translation";

// Tilawat uses polling-based playback
const APPWRITE_ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ||
  "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "";
const TRACKER_FUNCTION_ID =
  process.env.EXPO_PUBLIC_TILAWAT_TRACKER_FUNCTION_ID || "";
const APPWRITE_BUCKET_ID =
  process.env.EXPO_PUBLIC_APPWRITE_TILAWAT_BUCKET_ID || "";

const POLL_INTERVAL = 10000; // Poll every 10 seconds for tilawat

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

interface TrackPlayerContextType {
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  error: Error | null;
  currentMode: QuranMode;
  currentTrack: TilawatTrack | null; // Only populated in tilawat mode
  isInitialLoad: boolean; // Track if this is the first load
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
  const [currentTrack, setCurrentTrack] = useState<TilawatTrack | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const playbackState = usePlaybackState();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const trackStartTimeRef = useRef<number>(0); // Track when current track started playing
  const splashHiddenRef = useRef(false);

  const nativeIsPlaying = playbackState.state === State.Playing;

  // Sync shouldBePlaying with native state (handles notification controls)
  useEffect(() => {
    if (nativeIsPlaying && !shouldBePlaying) {
      setShouldBePlaying(true);
    } else if (!nativeIsPlaying && shouldBePlaying && !isLoading && playbackState.state === State.Paused) {
      setShouldBePlaying(false);
    }
  }, [nativeIsPlaying, playbackState.state]);

  // Get stream URL based on current mode (not used for tilawat)
  const getStreamUrl = useCallback((mode: QuranMode) => {
    switch (mode) {
      case "tafseer":
        return TAFSEER_STREAM_URL;
      case "translation":
        return TRANSLATION_STREAM_URL;
      default:
        return TAFSEER_STREAM_URL;
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

  // Get audio file URL from Appwrite with proper download parameter
  const getAudioUrl = useCallback((fileId: string) => {
    // Use download endpoint to get proper audio file with correct headers
    return `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`;
  }, []);

  // Fetch current tilawat state from backend
  const fetchTilawatState = useCallback(async () => {
    try {
      console.log(
        "[TrackPlayer] Fetching tilawat state from:",
        TRACKER_FUNCTION_ID,
      );

      const response = await fetch(TRACKER_FUNCTION_ID, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch state: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("[TrackPlayer] Received tilawat state:", {
        trackId: data.currentTrack?.id,
        title: data.currentTrack?.title,
        elapsed: data.currentTrack?.elapsedSeconds,
        duration: data.currentTrack?.duration,
      });

      if (data.success && data.currentTrack) {
        return data.currentTrack;
      }

      throw new Error("Failed to get valid state");
    } catch (err) {
      console.error("[TrackPlayer] Error fetching tilawat state:", err);
      throw err;
    }
  }, []);

  // Load and play tilawat track
  const loadTilawatTrack = useCallback(
    async (track: TilawatTrack) => {
      try {
        console.log(`[TrackPlayer] Loading tilawat track: ${track.title}`);

        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: track.id,
          url: getAudioUrl(track.fileId),
          title: track.title,
          artist: track.uploader || "Quran Recitation",
          artwork: track.thumbnail || require("../assets/images/icon.png"),
          duration: track.duration,
        });

        // Always start from beginning - backend controls the "live" position
        // Users joining mid-track will hear from the start until backend advances
        await TrackPlayer.seekTo(0);

        setCurrentTrack(track);
        currentTrackIdRef.current = track.id;
        trackStartTimeRef.current = Date.now(); // Record when we started this track

        if (shouldBePlaying) {
          await TrackPlayer.play();
        }
      } catch (err) {
        console.error("[TrackPlayer] Error loading tilawat track:", err);
        throw err;
      }
    },
    [getAudioUrl, shouldBePlaying],
  );

  // Poll backend for tilawat state changes
  const pollTilawatState = useCallback(async () => {
    try {
      const track = await fetchTilawatState();

      // Check if track changed - this is the only thing we care about
      if (track.id !== currentTrackIdRef.current) {
        console.log("[TrackPlayer] Tilawat track changed, loading new track");
        await loadTilawatTrack(track);
      } else {
        // Just update the track info in state for display purposes
        // Don't sync playback position - let it play naturally
        setCurrentTrack((prev) =>
          prev ? { ...prev, elapsedSeconds: track.elapsedSeconds } : null,
        );
      }
    } catch (err) {
      console.error("[TrackPlayer] Tilawat polling error:", err);
      setError(err as Error);
    }
  }, [fetchTilawatState, loadTilawatTrack]);

  // Hide splash screen once audio is ready to play
  useEffect(() => {
    const hideSplash = async () => {
      if (
        !splashHiddenRef.current &&
        isSetup &&
        !isLoading &&
        (nativeIsPlaying || error)
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
  }, [isSetup, isLoading, nativeIsPlaying, error]);

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

        // Load initial mode (tilawat with polling)
        if (currentMode === "tilawat") {
          const track = await fetchTilawatState();
          await loadTilawatTrack(track);
        } else {
          // Add the initial stream for tafseer/translation
          await TrackPlayer.add({
            id: "live-stream",
            url: getStreamUrl(currentMode),
            title: getStreamTitle(currentMode),
            artist: "Quran Recitation",
            artwork: require("../assets/images/icon.png"),
            isLiveStream: true,
          });
        }

        // Auto-play on mount
        await TrackPlayer.play();
        setShouldBePlaying(true);
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

  // Start/stop polling for tilawat mode
  useEffect(() => {
    if (currentMode === "tilawat" && shouldBePlaying && isSetup) {
      // Poll immediately on start
      console.log("[TrackPlayer] Starting tilawat polling (immediate poll)");
      pollTilawatState();

      // Then poll every 10 seconds
      pollIntervalRef.current = setInterval(pollTilawatState, POLL_INTERVAL);
      console.log("[TrackPlayer] Tilawat polling interval set");
    } else {
      // Stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        console.log("[TrackPlayer] Stopped tilawat polling");
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentMode, shouldBePlaying, isSetup, pollTilawatState]);

  // Update elapsed time display every second for tilawat mode (UI only)
  useEffect(() => {
    if (currentMode !== "tilawat" || !nativeIsPlaying || !currentTrack) return;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - trackStartTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      setCurrentTrack((prev) => (prev ? { ...prev, elapsedSeconds } : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMode, nativeIsPlaying, currentTrack?.id]);

  const play = useCallback(async () => {
    if (!isSetup) {
      console.warn("[TrackPlayer] Not setup yet");
      return;
    }

    try {
      setError(null);
      setShouldBePlaying(true);
      await TrackPlayer.play();
    } catch (err) {
      console.error("[TrackPlayer] Play error:", err);
      setShouldBePlaying(false);
      setError(err as Error);
    }
  }, [isSetup]);

  const pause = useCallback(async () => {
    try {
      setShouldBePlaying(false);
      await TrackPlayer.pause();
    } catch (err) {
      console.error("[TrackPlayer] Pause error:", err);
      setShouldBePlaying(true);
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
        const startTime = Date.now();

        // Stop current playback
        await TrackPlayer.stop();

        // Reset the queue
        await TrackPlayer.reset();

        // Clear tilawat track if switching away from tilawat
        if (currentMode === "tilawat") {
          setCurrentTrack(null);
          currentTrackIdRef.current = null;
        }

        // Update mode
        setCurrentMode(mode);

        if (mode === "tilawat") {
          // Load tilawat track with polling
          const track = await fetchTilawatState();
          await loadTilawatTrack(track);
        } else {
          // Add new stream for tafseer/translation
          await TrackPlayer.add({
            id: "live-stream",
            url: getStreamUrl(mode),
            title: getStreamTitle(mode),
            artist: "Quran Recitation",
            artwork: require("../assets/images/icon.png"),
            isLiveStream: true,
          });
        }

        // Start playing new stream/track
        await TrackPlayer.play();
        setShouldBePlaying(true);

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
    [
      currentMode,
      getStreamUrl,
      getStreamTitle,
      fetchTilawatState,
      loadTilawatTrack,
    ],
  );

  // Use shouldBePlaying for immediate UI response, native state for actual status
  const isBuffering =
    shouldBePlaying && playbackState.state !== State.Playing;

  const value: TrackPlayerContextType = {
    isPlaying: shouldBePlaying,
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
