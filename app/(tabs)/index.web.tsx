import { MiniPlayer } from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import {
  fetchAudios,
  formatDuration,
  getAudioViewUrl,
  getThumbnailUrl,
  type AudioMode,
  type QuranAudio,
} from "@/services/appwrite";
import { downloadManager } from "@/services/downloadManager";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PAGE_SIZE = 25;
const MODE_KEY = "@mode_browse";

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

const MODES: { key: AudioMode; label: string; blurb: string }[] = [
  {
    key: "tilawat",
    label: "Tilawat",
    blurb: "Recitation",
  },
  {
    key: "translation",
    label: "Translation",
    blurb: "Translation",
  },
  {
    key: "tafseer",
    label: "Tafseer",
    blurb: "Tafseer",
  },
];

export default function BrowseWebScreen() {
  const {
    playTrack,
    currentTrack,
    isBrowsePlaying,
    play,
    pauseBrowse,
    isBrowseEnded,
    isAutoplay,
  } = useTrackPlayer();
  const [mode, setMode] = useState<AudioMode | null>(null);
  const [audios, setAudios] = useState<QuranAudio[]>([]);
  const [orderedAudios, setOrderedAudios] = useState<QuranAudio[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [downloads, setDownloads] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [isShuffled, setIsShuffled] = useState(false);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayRef = useRef({
    isAutoplay,
    audios,
    currentTrack,
    mode,
    playTrack,
  });

  useEffect(() => {
    autoplayRef.current = { isAutoplay, audios, currentTrack, mode, playTrack };
  });

  useEffect(() => {
    if (!isBrowseEnded) return;
    const { isAutoplay, audios, currentTrack, mode, playTrack } =
      autoplayRef.current;
    if (!isAutoplay || !currentTrack) return;
    const currentIndex = audios.findIndex((audio) => audio.$id === currentTrack.id);
    if (currentIndex === -1 || currentIndex >= audios.length - 1) return;
    const next = audios[currentIndex + 1];
    playTrack(
      {
        id: next.$id,
        title: next.title,
        duration: next.duration,
        fileId: next.fileId,
        thumbnail: next.thumbnail,
        youtubeId: next.youtubeId,
        uploader: next.uploader,
      },
      mode,
    );
  }, [isBrowseEnded]);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((saved) => {
      setMode((saved as AudioMode) || "tilawat");
    });
    downloadManager.initialize().then(() => {
      const allDownloads = downloadManager.getAllDownloads();
      setDownloads(new Set(allDownloads.map((item) => item.id)));
    });
  }, []);

  useEffect(() => {
    if (mode === null) return;
    const loadAudios = async () => {
      try {
        setLoading(true);
        const result = await fetchAudios(mode, PAGE_SIZE, 0, activeSearch);
        setOrderedAudios(result.documents);
        setAudios(isShuffled ? shuffleArray(result.documents) : result.documents);
        setTotal(result.total);
        setError(null);
      } catch (fetchError) {
        console.error("[Browse:web] Fetch error:", fetchError);
        setError("Failed to load audios. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    loadAudios();
  }, [activeSearch, isShuffled, mode]);

  useEffect(() => {
    if (audios.length === 0) return;
    const keys = audios.map((audio) => `@audio_progress_${audio.$id}`);
    AsyncStorage.multiGet(keys).then((pairs) => {
      const map: Record<string, number> = {};
      pairs.forEach(([key, value]) => {
        if (!value) return;
        try {
          const { position, duration } = JSON.parse(value);
          if (duration > 0) {
            map[key.replace("@audio_progress_", "")] = Math.min(
              (position / duration) * 100,
              100,
            );
          }
        } catch {
          // ignore malformed entries
        }
      });
      setAudioProgress(map);
    });
  }, [audios]);

  const featured = useMemo(() => audios.slice(0, 3), [audios]);

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveSearch(text), 350);
  };

  const switchMode = (newMode: AudioMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    AsyncStorage.setItem(MODE_KEY, newMode);
  };

  const handleShuffle = () => {
    if (isShuffled) {
      setAudios(orderedAudios);
      setIsShuffled(false);
      return;
    }

    setAudios(shuffleArray(orderedAudios));
    setIsShuffled(true);
  };

  const handlePlay = (item: QuranAudio) => {
    if (currentTrack?.id === item.$id && isBrowsePlaying) {
      void pauseBrowse();
      return;
    }
    if (currentTrack?.id === item.$id && !isBrowsePlaying) {
      void play();
      return;
    }
    void playTrack(
      {
        id: item.$id,
        title: item.title,
        duration: item.duration,
        fileId: item.fileId,
        thumbnail: item.thumbnail,
        youtubeId: item.youtubeId,
        uploader: item.uploader,
      },
      mode ?? "tilawat",
    );
  };

  const handleDownload = async (item: QuranAudio) => {
    const currentMode = mode ?? "tilawat";
    try {
      setDownloading((prev) => new Set(prev).add(item.$id));
      const audioUrl = getAudioViewUrl(item.fileId, currentMode);

      const result = await downloadManager.downloadAudio(
        item.$id,
        item.title,
        item.duration,
        audioUrl,
        currentMode,
        item.thumbnail || getThumbnailUrl(item.youtubeId),
      );

      if (result) {
        setDownloads((prev) => new Set(prev).add(item.$id));
      }
    } catch (downloadError) {
      console.error("[Browse:web] Download error:", downloadError);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(item.$id);
        return next;
      });
    }
  };

  const loadMore = async () => {
    if (loadingMore || audios.length >= total || mode === null) return;
    try {
      setLoadingMore(true);
      const result = await fetchAudios(mode, PAGE_SIZE, audios.length, activeSearch);
      setOrderedAudios((prev) => {
        const merged = [...prev, ...result.documents];
        setAudios(isShuffled ? shuffleArray(merged) : merged);
        return merged;
      });
    } catch (fetchError) {
      console.error("[Browse:web] Load more error:", fetchError);
    } finally {
      setLoadingMore(false);
    }
  };

  if (mode === null) return null;

  return (
    <View className="flex-1 bg-transparent">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 40, paddingBottom: currentTrack ? 140 : 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 flex-row items-start justify-between">
          <View className="max-w-[680px]">
            <Text className="text-4xl font-bold leading-[48px] text-white">
              Browse
            </Text>
          </View>

          <View className="w-[340px] rounded-[28px] border border-white/10 bg-[#0a140e] p-5">
            <View className="mt-4 flex-row items-center gap-3">
              <View className="flex-1 flex-row items-center rounded-2xl border border-white/10 bg-black/20 px-4">
                <MaterialIcons name="search" size={20} color="#737373" />
                <TextInput
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  placeholder="Search audios..."
                  placeholderTextColor="#737373"
                  className="flex-1 py-4 pl-3 text-sm text-white"
                />
              </View>
              <TouchableOpacity
                onPress={handleShuffle}
                className={`h-14 w-14 items-center justify-center rounded-2xl border ${
                  isShuffled
                    ? "border-emerald-400/30 bg-emerald-500/10"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <MaterialIcons
                  name="shuffle"
                  size={22}
                  color={isShuffled ? colors.primary.light : "#d4d4d4"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="mb-10 flex-row gap-4">
          {MODES.map((item) => {
            const isActive = item.key === mode;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => switchMode(item.key)}
                className={`w-[250px] rounded-[28px] border p-5 ${
                  isActive
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-white/10 bg-[#0a140e]"
                }`}
              >
                <Text
                  className={`text-xl font-semibold ${
                    isActive ? "text-white" : "text-neutral-200"
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View className="items-center justify-center py-24">
            <ActivityIndicator size="large" color={colors.primary.light} />
            <Text className="mt-4 text-neutral-400">Loading library...</Text>
          </View>
        ) : error ? (
          <View className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-8">
            <Text className="text-lg font-semibold text-white">{error}</Text>
          </View>
        ) : (
          <>
            {featured.length > 0 && (
              <View className="mb-10">
                <Text className="mb-5 text-sm font-semibold text-white">Featured</Text>
                <View className="flex-row gap-5">
                  {featured.map((item) => {
                    const thumbnailUri = item.thumbnail || getThumbnailUrl(item.youtubeId);
                    const isActive = currentTrack?.id === item.$id && isBrowsePlaying;
                    return (
                      <TouchableOpacity
                        key={item.$id}
                        onPress={() => handlePlay(item)}
                        activeOpacity={0.85}
                        className="flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#0a140e]"
                      >
                        <View style={{ aspectRatio: 16 / 9 }}>
                          <Image
                            source={{ uri: thumbnailUri }}
                            style={StyleSheet.absoluteFillObject}
                            contentFit="cover"
                            transition={200}
                          />
                        </View>
                        <View className="p-6">
                          <Text className="text-xl font-semibold text-white" numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text className="mt-2 text-sm text-neutral-400">
                            {formatDuration(item.duration)}
                          </Text>
                          <View className="mt-5 flex-row items-center justify-between">
                            <View className="rounded-full bg-white/5 px-4 py-2">
                              <Text className="text-xs uppercase tracking-[1.8px] text-neutral-300">
                                {isActive ? "Playing" : "Ready"}
                              </Text>
                            </View>
                            <MaterialIcons
                              name={isActive ? "equalizer" : "play-circle-filled"}
                              size={28}
                              color={isActive ? colors.primary.light : "#d4d4d4"}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <Text className="mb-5 text-sm font-semibold text-white">All</Text>

            <View className="flex-row flex-wrap justify-between">
              {audios.map((item) => {
                const thumbnailUri = item.thumbnail || getThumbnailUrl(item.youtubeId);
                const isCurrentlyPlaying =
                  currentTrack?.id === item.$id && isBrowsePlaying;
                const isDownloaded = downloads.has(item.$id);
                const isDownloading = downloading.has(item.$id);
                const progressPercent = audioProgress[item.$id] ?? 0;

                return (
                  <View
                    key={item.$id}
                    className="mb-6 overflow-hidden rounded-[26px] border border-white/10 bg-[#09130d]"
                    style={{ width: "32%" }}
                  >
                    <TouchableOpacity activeOpacity={0.9} onPress={() => handlePlay(item)}>
                      <View style={{ aspectRatio: 16 / 9 }}>
                        <Image
                          source={{ uri: thumbnailUri }}
                          style={StyleSheet.absoluteFillObject}
                          contentFit="cover"
                          transition={200}
                        />
                        {progressPercent > 0 && (
                          <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                            <View
                              className="h-full bg-emerald-400"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>

                    <View className="p-5">
                      <Text
                        className={`text-base font-semibold ${
                          isCurrentlyPlaying ? "text-primary-light" : "text-white"
                        }`}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <View className="mt-3 flex-row items-center justify-between">
                        <Text className="text-sm text-neutral-400">
                          {formatDuration(item.duration)}
                        </Text>
                        {isDownloaded ? (
                          <MaterialIcons name="download-done" size={20} color="#6ee7b7" />
                        ) : isDownloading ? (
                          <ActivityIndicator size="small" color={colors.primary.light} />
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleDownload(item)}
                            className="rounded-full border border-white/10 bg-white/5 p-2"
                          >
                            <MaterialIcons name="download" size={18} color="#d4d4d4" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {audios.length < total && (
              <TouchableOpacity
                onPress={() => void loadMore()}
                className="mt-2 self-center rounded-full border border-white/10 bg-white/5 px-6 py-3"
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary.light} />
                ) : (
                  <Text className="text-sm font-semibold text-white">Load More</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <MiniPlayer />
    </View>
  );
}
