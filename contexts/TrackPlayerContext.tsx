/**
 * Track Player Context
 * Uses react-native-track-player for reliable background audio streaming
 * Supports multiple modes: Tafseer, Tilawat, and Translation (all live streaming)
 */

import { getAudioFileUrl } from "@/services/appwrite";
import { historyManager } from "@/services/historyManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
} from "@weights-ai/react-native-track-player";
import {
  getPersistedLiveMode,
  getStreamTitle,
  getStreamUrl,
  LIVE_MODE_KEY,
  reconnectLiveStream,
  type QuranMode,
} from "@/services/liveStream";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

function isAlreadyInitializedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("already been initialized via setupPlayer")
  );
}

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
  // Live stream state
  isLivePlaying: boolean;
  isLiveBuffering: boolean;
  isLiveLoading: boolean;
  liveError: Error | null;
  currentMode: QuranMode;

  // On-demand track state
  isBrowsePlaying: boolean;
  isBrowseBuffering: boolean;
  isBrowseLoading: boolean;
  browseError: Error | null;
  currentTrack: TilawatTrack | null;

  // Live stream controls
  playLive: () => Promise<void>;
  pauseLive: () => Promise<void>;
  stopLive: () => Promise<void>;
  switchMode: (mode: QuranMode) => Promise<void>;

  // Browse track controls
  playTrack: (track: TilawatTrack, mode?: QuranMode) => Promise<void>;
  pauseBrowse: () => Promise<void>;
  stopBrowse: () => Promise<void>;
  isBrowseEnded: boolean;
  isAutoplay: boolean;
  setIsAutoplay: (value: boolean) => void;
  browseProgressPercent: number;

  // Legacy compatibility (will be removed)
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  error: Error | null;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
}

const TrackPlayerContext = createContext<TrackPlayerContextType | undefined>(
  undefined,
);

export const TrackPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Live stream state
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<Error | null>(null);
  const [currentMode, setCurrentMode] = useState<QuranMode>("tilawat");
  const [liveModePersisted, setLiveModePersisted] = useState(false);

  // Browse track state
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<Error | null>(null);
  const [currentTrack, setCurrentTrack] = useState<TilawatTrack | null>(null);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const setupPromiseRef = useRef<Promise<void> | null>(null);

  const playbackState = usePlaybackState();

  // Determine which player is active based on current track
  const isLiveActive = currentTrack === null;
  const isBrowseActive = currentTrack !== null;

  const isLivePlaying = isLiveActive && playbackState.state === State.Playing;
  const isLiveBuffering =
    isLiveActive && playbackState.state === State.Buffering;
  const isBrowsePlaying =
    isBrowseActive && playbackState.state === State.Playing;
  const isBrowseBuffering =
    isBrowseActive && playbackState.state === State.Buffering;
  const isBrowseEnded = isBrowseActive && playbackState.state === State.Ended;

  // Progress tracking for browse tracks
  const browseProgress = useProgress(1000);
  const lastSavedPositionRef = useRef(0);

  const browseProgressPercent = (() => {
    if (!isBrowseActive || browseProgress.position <= 0) return 0;
    const d =
      browseProgress.duration > 0
        ? browseProgress.duration
        : (currentTrack?.duration ?? 0);
    return d > 0 ? Math.min((browseProgress.position / d) * 100, 100) : 0;
  })();

  // Persist progress to AsyncStorage every ~5 seconds while playing
  useEffect(() => {
    if (!isBrowsePlaying || !currentTrack || browseProgress.position <= 0)
      return;
    if (browseProgress.position - lastSavedPositionRef.current < 5) return;
    lastSavedPositionRef.current = browseProgress.position;
    const d =
      browseProgress.duration > 0
        ? browseProgress.duration
        : currentTrack.duration;
    if (d <= 0) return;
    AsyncStorage.setItem(
      `@audio_progress_${currentTrack.id}`,
      JSON.stringify({ position: browseProgress.position, duration: d }),
    );
  }, [
    browseProgress.position,
    browseProgress.duration,
    isBrowsePlaying,
    currentTrack,
  ]);

  // Legacy compatibility
  const isPlaying = playbackState.state === State.Playing;
  const isBuffering = playbackState.state === State.Buffering;
  const isLoading = isLiveLoading || isBrowseLoading;
  const error = liveError || browseError;

  // Get audio file URL from Appwrite (for on-demand playback)
  const getAudioUrl = useCallback((fileId: string, mode: QuranMode) => {
    return getAudioFileUrl(fileId, mode);
  }, []);

  // Load persisted live mode
  useEffect(() => {
    getPersistedLiveMode().then((saved) => {
      setCurrentMode(saved);
      setLiveModePersisted(true);
    });

    historyManager.initialize();
  }, []);

  const ensurePlayerReady = useCallback(async () => {
    if (setupPromiseRef.current) {
      await setupPromiseRef.current;
      return;
    }

    setupPromiseRef.current = (async () => {
      try {
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
        });
      } catch (err) {
        if (!isAlreadyInitializedError(err)) {
          throw err;
        }
      }

      await TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [Capability.Play, Capability.Pause],
      });

      console.log("[TrackPlayer] Setup complete");
    })();

    try {
      await setupPromiseRef.current;
    } catch (err) {
      setupPromiseRef.current = null;
      throw err;
    }
  }, []);

  // Setup TrackPlayer — wait until persisted mode is loaded
  useEffect(() => {
    if (!liveModePersisted) return;
    const setup = async () => {
      try {
        await ensurePlayerReady();
        // Add the initial stream
        await reconnectLiveStream(currentMode);
      } catch (err) {
        console.error("[TrackPlayer] Setup error:", err);
        setLiveError(err as Error);
      }
    };

    setup();

    return () => {
      // Keep player initialization sticky for the app lifetime.
    };
  }, [ensurePlayerReady, liveModePersisted]);

  const playLive = useCallback(async () => {
    try {
      setLiveError(null);
      await ensurePlayerReady();

      // If browse track is playing, stop it and switch to live
      if (currentTrack) {
        setCurrentTrack(null);
      }

      await reconnectLiveStream(currentMode);
      console.log("[TrackPlayer] Live play called");
    } catch (err) {
      console.error("[TrackPlayer] Live play error:", err);
      setLiveError(err as Error);
    }
  }, [currentTrack, currentMode, ensurePlayerReady]);

  const pauseLive = useCallback(async () => {
    if (currentTrack) return; // Only pause if live is active

    try {
      await TrackPlayer.pause();
      console.log("[TrackPlayer] Live pause called");
    } catch (err) {
      console.error("[TrackPlayer] Live pause error:", err);
      setLiveError(err as Error);
    }
  }, [currentTrack]);

  const stopLive = useCallback(async () => {
    if (currentTrack) return; // Only stop if live is active

    try {
      await TrackPlayer.stop();
      console.log("[TrackPlayer] Live stop called");
    } catch (err) {
      console.error("[TrackPlayer] Live stop error:", err);
    }
  }, [currentTrack]);

  const pauseBrowse = useCallback(async () => {
    if (!currentTrack) return; // Only pause if browse is active

    try {
      await TrackPlayer.pause();
      console.log("[TrackPlayer] Browse pause called");
    } catch (err) {
      console.error("[TrackPlayer] Browse pause error:", err);
      setBrowseError(err as Error);
    }
  }, [currentTrack]);

  const stopBrowse = useCallback(async () => {
    if (!currentTrack) return; // Only stop if browse is active

    try {
      await TrackPlayer.stop();
      setCurrentTrack(null);
      console.log("[TrackPlayer] Browse stop called");
    } catch (err) {
      console.error("[TrackPlayer] Browse stop error:", err);
    }
  }, [currentTrack]);

  // Legacy methods for backward compatibility
  const play = useCallback(async () => {
    if (currentTrack) {
      // Browse is active, play browse track
      try {
        await TrackPlayer.play();
      } catch (err) {
        setBrowseError(err as Error);
      }
    } else {
      // Live is active, play live stream
      await playLive();
    }
  }, [currentTrack, playLive]);

  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
      console.log("[TrackPlayer] Pause called");
    } catch (err) {
      console.error("[TrackPlayer] Pause error:", err);
      if (currentTrack) {
        setBrowseError(err as Error);
      } else {
        setLiveError(err as Error);
      }
    }
  }, [currentTrack]);

  const stop = useCallback(async () => {
    try {
      await TrackPlayer.stop();
      if (currentTrack) {
        setCurrentTrack(null);
      }
      console.log("[TrackPlayer] Stop called");
    } catch (err) {
      console.error("[TrackPlayer] Stop error:", err);
    }
  }, [currentTrack]);

  const switchMode = useCallback(
    async (mode: QuranMode) => {
      if (mode === currentMode) return;

      try {
        setIsLiveLoading(true);
        setLiveError(null);
        const startTime = Date.now();
        await ensurePlayerReady();

        // Stop current playback
        // Clear on-demand track if any
        setCurrentTrack(null);

        // Update mode
        setCurrentMode(mode);
        await AsyncStorage.setItem(LIVE_MODE_KEY, mode);
        await reconnectLiveStream(mode);

        // Ensure minimum loading duration for smooth UX
        const elapsed = Date.now() - startTime;
        const minDuration = 800;
        if (elapsed < minDuration) {
          await new Promise((resolve) =>
            setTimeout(resolve, minDuration - elapsed),
          );
        }

        console.log(`[TrackPlayer] Switched to ${mode} mode`);
        setIsLiveLoading(false);
      } catch (err) {
        console.error("[TrackPlayer] Mode switch error:", err);
        setLiveError(err as Error);
        setIsLiveLoading(false);
      }
    },
    [currentMode, ensurePlayerReady],
  );

  // Play a specific track on demand (from audio list)
  const playTrack = useCallback(
    async (track: TilawatTrack, mode: QuranMode = currentMode) => {
      try {
        setIsBrowseLoading(true);
        setBrowseError(null);
        await ensurePlayerReady();

        // Keep context mode aligned with selected browse/download mode.
        setCurrentMode(mode);

        await TrackPlayer.reset();

        // Check if fileId is a local file path (starts with file://)
        const isLocalFile = track.fileId.startsWith("file://");
        const audioUrl = isLocalFile
          ? track.fileId
          : getAudioUrl(track.fileId, mode);

        await TrackPlayer.add({
          id: track.id,
          url: audioUrl,
          title: track.title,
          artwork: track.thumbnail || require("../assets/images/icon.png"),
          duration: track.duration,
        });

        let resumePosition = 0;
        try {
          const savedProgressRaw = await AsyncStorage.getItem(
            `@audio_progress_${track.id}`,
          );

          if (savedProgressRaw) {
            const savedProgress = JSON.parse(savedProgressRaw) as {
              position?: number;
              duration?: number;
            };

            const savedPosition =
              typeof savedProgress.position === "number"
                ? savedProgress.position
                : 0;
            const savedDuration =
              typeof savedProgress.duration === "number"
                ? savedProgress.duration
                : 0;
            const effectiveDuration =
              track.duration > 0 ? track.duration : savedDuration;

            if (savedPosition > 0) {
              // Keep seek position inside the valid media range.
              resumePosition =
                effectiveDuration > 0
                  ? Math.min(savedPosition, Math.max(effectiveDuration - 1, 0))
                  : savedPosition;
            }
          }
        } catch (progressErr) {
          console.warn(
            "[TrackPlayer] Failed to read saved progress:",
            progressErr,
          );
        }

        await TrackPlayer.seekTo(resumePosition);
        lastSavedPositionRef.current = resumePosition;
        setCurrentTrack(track);

        await historyManager.addEntry({
          id: track.id,
          title: track.title,
          duration: track.duration,
          fileId: track.fileId,
          thumbnail: track.thumbnail,
          mode,
          source: track.fileId.startsWith("file://") ? "downloads" : "browse",
        });

        await TrackPlayer.play();
        setIsBrowseLoading(false);
      } catch (err) {
        console.error("[TrackPlayer] playTrack error:", err);
        setBrowseError(err as Error);
        setIsBrowseLoading(false);
      }
    },
    [currentMode, ensurePlayerReady, getAudioUrl],
  );

  const value: TrackPlayerContextType = {
    // Live stream state
    isLivePlaying,
    isLiveBuffering,
    isLiveLoading,
    liveError,
    currentMode,

    // Browse track state
    isBrowsePlaying,
    isBrowseBuffering,
    isBrowseLoading,
    browseError,
    currentTrack,

    // Live stream controls
    playLive,
    pauseLive,
    stopLive,
    switchMode,

    // Browse track controls
    playTrack,
    pauseBrowse,
    stopBrowse,
    isBrowseEnded,
    isAutoplay,
    setIsAutoplay,
    browseProgressPercent,

    // Legacy compatibility
    isPlaying,
    isBuffering,
    isLoading,
    error,
    play,
    pause,
    stop,
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

export type { QuranMode } from "@/services/liveStream";
