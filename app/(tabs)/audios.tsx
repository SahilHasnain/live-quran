import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import {
  fetchAudios,
  formatDuration,
  getThumbnailUrl,
  type AudioMode,
  type QuranAudio,
} from "@/services/appwrite";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

const PAGE_SIZE = 25;
const MODES: { key: AudioMode; label: string }[] = [
  { key: "tilawat", label: "Tilawat" },
  { key: "translation", label: "Translation" },
  { key: "tafseer", label: "Tafseer" },
];

export default function AudiosScreen() {
  const { playTrack, currentTrack, isPlaying } = useTrackPlayer();
  const { handleScroll: handleHeaderScroll, translateY: headerTranslateY, showHeader } = useHeaderVisibility();
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const [mode, setMode] = useState<AudioMode>("tilawat");
  const [audios, setAudios] = useState<QuranAudio[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAudios = useCallback(
    async (offset = 0, search = activeSearch, currentMode = mode) => {
      try {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        const result = await fetchAudios(currentMode, PAGE_SIZE, offset, search);
        setTotal(result.total);

        if (offset === 0) {
          setAudios(result.documents);
        } else {
          setAudios((prev) => [...prev, ...result.documents]);
        }
        setError(null);
      } catch (err) {
        setError("Failed to load audios. Please try again.");
        console.error("[Audios] Fetch error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeSearch, mode],
  );

  useEffect(() => {
    loadAudios(0, activeSearch, mode);
  }, [activeSearch, mode, loadAudios]);

  useFocusEffect(
    useCallback(() => {
      showHeader();
    }, [showHeader]),
  );

  const switchMode = (newMode: AudioMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setSearchQuery("");
    setActiveSearch("");
  };

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setActiveSearch(text);
    }, 400);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
  };

  const loadMore = () => {
    if (!loadingMore && audios.length < total) {
      loadAudios(audios.length, activeSearch, mode);
    }
  };

  const handlePlay = (item: QuranAudio) => {
    playTrack({
      id: item.$id,
      title: item.title,
      duration: item.duration,
      fileId: item.fileId,
      thumbnail: item.thumbnail,
      youtubeId: item.youtubeId,
      uploader: item.uploader,
      elapsedSeconds: 0,
      remainingSeconds: item.duration,
    });
  };

  const handleScroll = (event: any) => {
    handleHeaderScroll(event);
    handleTabBarScroll(event);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const renderItem = ({ item }: { item: QuranAudio }) => {
    const thumbnailUri = item.thumbnail || getThumbnailUrl(item.youtubeId);
    const isCurrentlyPlaying = currentTrack?.id === item.$id && isPlaying;

    return (
      <TouchableOpacity
        onPress={() => handlePlay(item)}
        activeOpacity={0.7}
        className={`flex-row items-center px-4 py-2 gap-4 ${isCurrentlyPlaying ? "bg-emerald-900/20" : ""}`}
        accessibilityLabel={`Play ${item.title}`}
        accessibilityRole="button"
      >
        <View>
          <Image
            source={{ uri: thumbnailUri }}
            style={{ width: 160, height: 90, borderRadius: 8 }}
            contentFit="cover"
            transition={200}
          />
          {isCurrentlyPlaying && (
            <View
              className="absolute inset-0 items-center justify-center"
              style={{ borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)" }}
            >
              <MaterialIcons name="equalizer" size={28} color="#10b981" />
            </View>
          )}
          <View
            className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded"
          >
            <Text className="text-white text-xs font-semibold">
              {formatDuration(item.duration)}
            </Text>
          </View>
        </View>
        <View className="flex-1 gap-1.5">
          <Text
            className={`text-base font-medium ${isCurrentlyPlaying ? "text-emerald-400" : "text-white"}`}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.uploader && (
            <Text className="text-neutral-500 text-sm" numberOfLines={1}>
              {item.uploader}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  };
  return (
    <View className="flex-1 bg-[#0f0f0f]">
      <StatusBar barStyle="light-content" />

      {/* Animated Header */}
      <Animated.View
        style={[headerAnimatedStyle]}
        className="absolute top-0 left-0 right-0 z-50 bg-[#0f0f0f]"
      >
        {/* Header with Search */}
        <View className="pt-14 pb-2 px-4">
          <View className="flex-row items-center bg-[#1a1a1a] rounded-xl px-3 gap-2">
            <MaterialIcons name="search" size={20} color="#525252" />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Search audios..."
              placeholderTextColor="#525252"
              className="flex-1 text-white text-sm py-3"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search audios"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} accessibilityLabel="Clear search">
                <MaterialIcons name="close" size={18} color="#525252" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Mode Tabs */}
        <View className="px-4 pb-2 flex-row gap-2">
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => switchMode(m.key)}
              className={`flex-1 py-3 px-4 rounded-full ${
                mode === m.key ? "bg-emerald-600" : "bg-[#1a1a1a]"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  mode === m.key ? "text-white" : "text-neutral-400"
                }`}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center" style={{ paddingTop: 120 }}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-neutral-400 mt-3">Loading audios...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: 120 }}>
          <MaterialIcons name="error-outline" size={48} color="#ef4444" />
          <Text className="text-neutral-400 text-center mt-3">{error}</Text>
          <TouchableOpacity
            onPress={() => loadAudios()}
            className="mt-4 bg-emerald-600 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.FlatList
          data={audios}
          keyExtractor={(item) => item.$id}
          renderItem={renderItem}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <MaterialIcons name="search-off" size={48} color="#525252" />
              <Text className="text-neutral-500 mt-3">No audios found</Text>
            </View>
          }
          contentContainerStyle={{ paddingTop: 136, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
