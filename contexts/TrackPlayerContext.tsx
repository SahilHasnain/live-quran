/**
 * Track Player Context
 * Uses react-native-track-player for reliable background audio streaming
 * Supports multiple modes: Tafseer, Tilawat, and Translation (all live streaming)
 */

import { getAudioFileUrl } from "@/services/appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
} from "@weights-ai/react-native-track-player";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type QuranMode = "tafseer" | "tilawat" | "translation";

const TAFSEER_STREAM_URL = "https://livequran.duckdns.org/tafseer";
const TILAWAT_STREAM_URL = "https://livequran.duckdns.org/tilawat";
const TRANSLATION_STREAM_URL = "https://livequran.duckdns.org/translation";
const LIVE_MODE_KEY = "@mode_live";

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
  const [isLiveSetup, setIsLiveSetup] = useState(false);
  const [currentMode, setCurrentMode] = useState<QuranMode>("tilawat");
  const [liveModePersisted, setLiveModePersisted] = useState(false);

  // Browse track state
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<Error | null>(null);
  const [isBrowseSetup, setIsBrowseSetup] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TilawatTrack | null>(null);
  const [isAutoplay, setIsAutoplay] = useState(false);

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
  const getAudioUrl = useCallback((fileId: string, mode: QuranMode) => {
    return getAudioFileUrl(fileId, mode);
  }, []);

  // Load persisted live mode
  useEffect(() => {
    AsyncStorage.getItem(LIVE_MODE_KEY).then((saved) => {
      if (saved) setCurrentMode(saved as QuranMode);
      setLiveModePersisted(true);
    });
  }, []);

  // Setup TrackPlayer — wait until persisted mode is loaded
  useEffect(() => {
    if (!liveModePersisted) return;
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

        setIsLiveSetup(true);
        setIsBrowseSetup(true);
        console.log("[TrackPlayer] Setup complete");

        // Add the initial stream
        await TrackPlayer.add({
          id: "live-stream",
          url: getStreamUrl(currentMode),
          title: getStreamTitle(currentMode),
          artwork: require("../assets/images/icon.png"),
          isLiveStream: true,
        });
      } catch (err) {
        console.error("[TrackPlayer] Setup error:", err);
        setLiveError(err as Error);
      }
    };

    setup();

    return () => {
      TrackPlayer.reset();
    };
  }, [liveModePersisted]);

  const playLive = useCallback(async () => {
    if (!isLiveSetup) {
      console.warn("[TrackPlayer] Live not setup yet");
      return;
    }

    try {
      setLiveError(null);

      // If browse track is playing, stop it and switch to live
      if (currentTrack) {
        await TrackPlayer.reset();
        setCurrentTrack(null);

        // Add live stream back
        await TrackPlayer.add({
          id: "live-stream",
          url: getStreamUrl(currentMode),
          title: getStreamTitle(currentMode),
          artwork: require("../assets/images/icon.png"),
          isLiveStream: true,
        });
      }

      await TrackPlayer.play();
      console.log("[TrackPlayer] Live play called");
    } catch (err) {
      console.error("[TrackPlayer] Live play error:", err);
      setLiveError(err as Error);
    }
  }, [isLiveSetup, currentTrack, currentMode, getStreamUrl, getStreamTitle]);

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

        // Stop current playback
        await TrackPlayer.stop();

        // Reset the queue
        await TrackPlayer.reset();

        // Clear on-demand track if any
        setCurrentTrack(null);

        // Update mode
        setCurrentMode(mode);
        AsyncStorage.setItem(LIVE_MODE_KEY, mode);
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
        setIsLiveLoading(false);
      } catch (err) {
        console.error("[TrackPlayer] Mode switch error:", err);
        setLiveError(err as Error);
        setIsLiveLoading(false);
      }
    },
    [currentMode, getStreamUrl, getStreamTitle],
  );

  // Play a specific track on demand (from audio list)
  const playTrack = useCallback(
    async (track: TilawatTrack, mode: QuranMode = currentMode) => {
      try {
        setIsBrowseLoading(true);
        setBrowseError(null);

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

        await TrackPlayer.play();
        setIsBrowseLoading(false);
      } catch (err) {
        console.error("[TrackPlayer] playTrack error:", err);
        setBrowseError(err as Error);
        setIsBrowseLoading(false);
      }
    },
    [currentMode, getAudioUrl],
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
