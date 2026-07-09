import { getAudioFileUrl } from "@/services/appwrite";
import { historyManager } from "@/services/historyManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  isLivePlaying: boolean;
  isLiveBuffering: boolean;
  isLiveLoading: boolean;
  liveError: Error | null;
  currentMode: QuranMode;
  isBrowsePlaying: boolean;
  isBrowseBuffering: boolean;
  isBrowseLoading: boolean;
  browseError: Error | null;
  currentTrack: TilawatTrack | null;
  playLive: () => Promise<void>;
  pauseLive: () => Promise<void>;
  stopLive: () => Promise<void>;
  switchMode: (mode: QuranMode) => Promise<void>;
  playTrack: (track: TilawatTrack, mode?: QuranMode) => Promise<void>;
  pauseBrowse: () => Promise<void>;
  stopBrowse: () => Promise<void>;
  isBrowseEnded: boolean;
  isAutoplay: boolean;
  setIsAutoplay: (value: boolean) => void;
  browseProgressPercent: number;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTrackRef = useRef<TilawatTrack | null>(null);
  const [currentMode, setCurrentMode] = useState<QuranMode>("tilawat");
  const [currentTrack, setCurrentTrack] = useState<TilawatTrack | null>(null);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [liveError, setLiveError] = useState<Error | null>(null);
  const [browseError, setBrowseError] = useState<Error | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBrowseEnded, setIsBrowseEnded] = useState(false);

  const isLiveActive = currentTrack === null;
  const isBrowseActive = currentTrack !== null;

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

  const getAudioUrl = useCallback((fileId: string, mode: QuranMode) => {
    return getAudioFileUrl(fileId, mode);
  }, []);

  const clearProgressPersistence = useCallback(() => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  }, []);

  const startProgressPersistence = useCallback(() => {
    clearProgressPersistence();
    saveIntervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      const track = currentTrackRef.current;
      if (!audio || !track || audio.paused || audio.currentTime <= 0) return;

      const effectiveDuration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : track.duration;

      if (effectiveDuration <= 0) return;

      AsyncStorage.setItem(
        `@audio_progress_${track.id}`,
        JSON.stringify({
          position: audio.currentTime,
          duration: effectiveDuration,
        }),
      ).catch((error) => {
        console.warn("[TrackPlayer:web] Failed to save progress:", error);
      });
    }, 5000);
  }, [clearProgressPersistence]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const loadSource = useCallback(
    async ({
      src,
      isLive,
      track,
      autoPlay = true,
      resumePosition = 0,
    }: {
      src: string;
      isLive: boolean;
      track: TilawatTrack | null;
      autoPlay?: boolean;
      resumePosition?: number;
    }) => {
      const audio = audioRef.current;
      if (!audio) return;

      clearProgressPersistence();
      setPosition(0);
      setDuration(isLive ? 0 : track?.duration ?? 0);
      setIsBrowseEnded(false);

      audio.pause();
      audio.src = src;
      audio.load();

      if (!isLive && resumePosition > 0) {
        const handleLoadedMetadata = () => {
          const safeResume =
            Number.isFinite(audio.duration) && audio.duration > 0
              ? Math.min(resumePosition, Math.max(audio.duration - 1, 0))
              : resumePosition;
          audio.currentTime = safeResume;
          setPosition(safeResume);
          audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      }

      if (!autoPlay) return;

      try {
        await audio.play();
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("Audio playback failed on web.");
      }
    },
    [clearProgressPersistence],
  );

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      if (currentTrackRef.current) {
        startProgressPersistence();
      }
    };
    const onPause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      clearProgressPersistence();
    };
    const onWaiting = () => {
      setIsBuffering(true);
    };
    const onPlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const onTimeUpdate = () => {
      setPosition(audio.currentTime || 0);
    };
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      setIsBrowseEnded(true);
      clearProgressPersistence();
    };
    const onError = () => {
      const mediaError = audio.error;
      const error = new Error(
        mediaError?.message || "The browser could not load this audio source.",
      );
      if (currentTrackRef.current) {
        setBrowseError(error);
        setIsBrowseLoading(false);
      } else {
        setLiveError(error);
        setIsLiveLoading(false);
      }
      setIsBuffering(false);
      setIsPlaying(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    AsyncStorage.getItem(LIVE_MODE_KEY).then((saved) => {
      if (saved) {
        setCurrentMode(saved as QuranMode);
      }
    });
    historyManager.initialize();

    return () => {
      clearProgressPersistence();
      audio.pause();
      audio.src = "";
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [clearProgressPersistence, startProgressPersistence]);

  const playLive = useCallback(async () => {
    try {
      setLiveError(null);
      setBrowseError(null);
      setIsLiveLoading(true);
      setCurrentTrack(null);
      await loadSource({
        src: getStreamUrl(currentMode),
        isLive: true,
        track: null,
      });
    } catch (error) {
      setLiveError(
        error instanceof Error ? error : new Error("Failed to play live audio."),
      );
    } finally {
      setIsLiveLoading(false);
    }
  }, [currentMode, getStreamUrl, loadSource]);

  const pauseLive = useCallback(async () => {
    if (!isLiveActive || !audioRef.current) return;
    audioRef.current.pause();
  }, [isLiveActive]);

  const stopLive = useCallback(async () => {
    if (!isLiveActive || !audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.removeAttribute("src");
    audioRef.current.load();
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);
    setIsBuffering(false);
  }, [isLiveActive]);

  const switchMode = useCallback(
    async (mode: QuranMode) => {
      if (mode === currentMode) return;
      setCurrentMode(mode);
      await AsyncStorage.setItem(LIVE_MODE_KEY, mode);

      if (!isLiveActive) return;

      try {
        setIsLiveLoading(true);
        setLiveError(null);
        await loadSource({
          src: getStreamUrl(mode),
          isLive: true,
          track: null,
          autoPlay: true,
        });
      } catch (error) {
        setLiveError(
          error instanceof Error
            ? error
            : new Error("Failed to switch live stream."),
        );
      } finally {
        setIsLiveLoading(false);
      }
    },
    [currentMode, getStreamUrl, isLiveActive, loadSource],
  );

  const playTrack = useCallback(
    async (track: TilawatTrack, mode: QuranMode = currentMode) => {
      try {
        setIsBrowseLoading(true);
        setBrowseError(null);
        setLiveError(null);
        setCurrentMode(mode);
        setCurrentTrack(track);

        const audioUrl = track.fileId.startsWith("file://")
          ? track.fileId
          : getAudioUrl(track.fileId, mode);

        let resumePosition = 0;
        try {
          const savedProgressRaw = await AsyncStorage.getItem(
            `@audio_progress_${track.id}`,
          );
          if (savedProgressRaw) {
            const savedProgress = JSON.parse(savedProgressRaw) as {
              position?: number;
            };
            if (typeof savedProgress.position === "number") {
              resumePosition = savedProgress.position;
            }
          }
        } catch (error) {
          console.warn("[TrackPlayer:web] Failed to read saved progress:", error);
        }

        await loadSource({
          src: audioUrl,
          isLive: false,
          track,
          resumePosition,
        });

        await historyManager.addEntry({
          id: track.id,
          title: track.title,
          duration: track.duration,
          fileId: track.fileId,
          thumbnail: track.thumbnail,
          mode,
          source: track.fileId.startsWith("file://") ? "downloads" : "browse",
        });
      } catch (error) {
        setBrowseError(
          error instanceof Error ? error : new Error("Failed to play audio."),
        );
      } finally {
        setIsBrowseLoading(false);
      }
    },
    [currentMode, getAudioUrl, loadSource],
  );

  const pauseBrowse = useCallback(async () => {
    if (!isBrowseActive || !audioRef.current) return;
    audioRef.current.pause();
  }, [isBrowseActive]);

  const stopBrowse = useCallback(async () => {
    if (!isBrowseActive || !audioRef.current) return;
    clearProgressPersistence();
    audioRef.current.pause();
    audioRef.current.removeAttribute("src");
    audioRef.current.load();
    setCurrentTrack(null);
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsBrowseEnded(false);
  }, [clearProgressPersistence, isBrowseActive]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (!audio.src) {
        if (currentTrack) {
          await playTrack(currentTrack, currentMode);
        } else {
          await playLive();
        }
        return;
      }
      await audio.play();
    } catch (error) {
      const nextError =
        error instanceof Error ? error : new Error("Failed to resume audio.");
      if (currentTrack) {
        setBrowseError(nextError);
      } else {
        setLiveError(nextError);
      }
    }
  }, [currentMode, currentTrack, playLive, playTrack]);

  const pause = useCallback(async () => {
    audioRef.current?.pause();
  }, []);

  const stop = useCallback(async () => {
    if (currentTrack) {
      await stopBrowse();
      return;
    }
    await stopLive();
  }, [currentTrack, stopBrowse, stopLive]);

  const browseProgressPercent =
    isBrowseActive && duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  const value = useMemo<TrackPlayerContextType>(
    () => ({
      isLivePlaying: isLiveActive && isPlaying,
      isLiveBuffering: isLiveActive && isBuffering,
      isLiveLoading,
      liveError,
      currentMode,
      isBrowsePlaying: isBrowseActive && isPlaying,
      isBrowseBuffering: isBrowseActive && isBuffering,
      isBrowseLoading,
      browseError,
      currentTrack,
      playLive,
      pauseLive,
      stopLive,
      switchMode,
      playTrack,
      pauseBrowse,
      stopBrowse,
      isBrowseEnded,
      isAutoplay,
      setIsAutoplay,
      browseProgressPercent,
      isPlaying,
      isBuffering,
      isLoading: isLiveLoading || isBrowseLoading,
      error: liveError || browseError,
      play,
      pause,
      stop,
    }),
    [
      browseError,
      browseProgressPercent,
      currentMode,
      currentTrack,
      isAutoplay,
      isBrowseActive,
      isBrowseEnded,
      isBrowseLoading,
      isBuffering,
      isLiveActive,
      isLiveLoading,
      isPlaying,
      liveError,
      pause,
      pauseBrowse,
      pauseLive,
      play,
      playLive,
      playTrack,
      stop,
      stopBrowse,
      stopLive,
      switchMode,
    ],
  );

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
