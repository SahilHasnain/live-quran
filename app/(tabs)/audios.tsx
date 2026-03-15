import { MiniPlayer } from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
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
import { downloadManager } from "@/services/downloadManager";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

const PAGE_SIZE = 25;
const MODES: { key: AudioMode; label: string }[] = [
  { key: "tilawat", label: "Tilawat" },
  { key: "translation", label: "Translation" },
  { key: "tafseer", label: "Tafseer" },
];
const TOOLTIP_KEY = "@browse_download_tooltip_shown";

export default function AudiosScreen() {
  const { playTrack, currentTrack, isBrowsePlaying, play, pauseBrowse } =
    useTrackPlayer();
  const {
    handleScroll: handleHeaderScroll,
    translateY: headerTranslateY,
    showHeader,
  } = useHeaderVisibility();
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const [mode, setMode] = useState<AudioMode>("tilawat");
  const [audios, setAudios] = useState<QuranAudio[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [downloads, setDownloads] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [longPressedItem, setLongPressedItem] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize download manager and check tooltip
  useEffect(() => {
    downloadManager.initialize().then(() => {
      const allDownloads = downloadManager.getAllDownloads();
      setDownloads(new Set(allDownloads.map((d) => d.id)));
    });

    // Check if tooltip has been shown
    AsyncStorage.getItem(TOOLTIP_KEY).then((value) => {
      if (!value) {
        setShowTooltip(true);
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowTooltip(false);
          AsyncStorage.setItem(TOOLTIP_KEY, "true");
        }, 5000);
      }
    });
  }, []);

  const loadAudios = useCallback(
    async (offset = 0, search = activeSearch, currentMode = mode) => {
      try {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        const result = await fetchAudios(
          currentMode,
          PAGE_SIZE,
          offset,
          search,
        );
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
    setShowModeMenu(false);
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
    // If this track is currently playing, toggle pause/play
    if (currentTrack?.id === item.$id && isBrowsePlaying) {
      pauseBrowse();
    } else if (currentTrack?.id === item.$id && !isBrowsePlaying) {
      play(); // This will resume the current track
    } else {
      // Play new track
      playTrack(
        {
          id: item.$id,
          title: item.title,
          duration: item.duration,
          fileId: item.fileId,
          thumbnail: item.thumbnail,
          youtubeId: item.youtubeId,
          uploader: item.uploader,
        },
        mode,
      );
    }
  };

  const handleDownload = async (item: QuranAudio) => {
    try {
      setDownloading((prev) => new Set(prev).add(item.$id));

      const audioUrl = `${process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${
        mode === "tilawat"
          ? process.env.EXPO_PUBLIC_APPWRITE_TILAWAT_BUCKET_ID
          : mode === "translation"
            ? process.env.EXPO_PUBLIC_APPWRITE_TRANSLATION_BUCKET_ID
            : process.env.EXPO_PUBLIC_APPWRITE_TAFSEER_BUCKET_ID
      }/files/${item.fileId}/view?project=${process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID}`;

      const result = await downloadManager.downloadAudio(
        item.$id,
        item.title,
        item.duration,
        audioUrl,
        mode,
        item.thumbnail || getThumbnailUrl(item.youtubeId),
      );

      setDownloading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.$id);
        return newSet;
      });

      if (result) {
        setDownloads((prev) => new Set(prev).add(item.$id));

        // Show native toast
        if (Platform.OS === "android") {
          ToastAndroid.show(
            "Audio downloaded successfully!",
            ToastAndroid.SHORT,
          );
        }
      } else {
        if (Platform.OS === "android") {
          ToastAndroid.show("Failed to download audio", ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      console.error("[Download] Error:", error);
      setDownloading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(item.$id);
        return newSet;
      });

      if (Platform.OS === "android") {
        ToastAndroid.show("Failed to download audio", ToastAndroid.SHORT);
      }
    }
  };

  const handleDeleteDownload = (item: QuranAudio) => {
    Alert.alert(
      "Delete Download",
      "Are you sure you want to delete this downloaded audio?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await downloadManager.deleteDownload(item.$id);
            if (success) {
              setDownloads((prev) => {
                const newSet = new Set(prev);
                newSet.delete(item.$id);
                return newSet;
              });
            }
          },
        },
      ],
    );
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
    const isCurrentlyPlaying = currentTrack?.id === item.$id && isBrowsePlaying;
    const isDownloaded = downloads.has(item.$id);
    const isDownloading = downloading.has(item.$id);
    const showDownloadButton = longPressedItem === item.$id;

    const handleLongPress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLongPressedItem(item.$id);

      // Hide tooltip if showing
      if (showTooltip) {
        setShowTooltip(false);
        AsyncStorage.setItem(TOOLTIP_KEY, "true");
      }
    };

    const handlePressOut = () => {
      // Keep button visible for a moment after release
      setTimeout(() => {
        setLongPressedItem(null);
      }, 2000);
    };

    return (
      <View className="px-4 py-2">
        <Pressable
          onPress={() => handlePlay(item)}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          delayLongPress={500}
        >
          <View className="flex-row items-start gap-4">
            {/* Thumbnail */}
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
                  style={{
                    borderRadius: 8,
                    backgroundColor: "rgba(0,0,0,0.4)",
                  }}
                >
                  <MaterialIcons
                    name="equalizer"
                    size={28}
                    color={colors.primary.light}
                  />
                </View>
              )}
              <View className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded">
                <Text className="text-xs font-semibold text-white">
                  {formatDuration(item.duration)}
                </Text>
              </View>
            </View>

            {/* Text Content */}
            <View className="flex-1 justify-start gap-1.5 pr-12">
              <Text
                className={`text-base font-medium ${isCurrentlyPlaying ? "text-primary-light" : "text-white"}`}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>

            {/* Download Button - Only show when long-pressed or downloading */}
            {(showDownloadButton || isDownloading) && (
              <View
                className="absolute right-0 top-1/2"
                style={{ transform: [{ translateY: -20 }] }}
              >
                {isDownloading ? (
                  <View className="items-center justify-center w-10 h-10">
                    <MaterialIcons
                      name="schedule"
                      size={20}
                      color={colors.primary.light}
                    />
                  </View>
                ) : isDownloaded ? (
                  <View className="items-center justify-center w-10 h-10">
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color={colors.primary.light}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleDownload(item)}
                    className="items-center justify-center w-10 h-10 rounded-full bg-primary/20"
                    accessibilityLabel="Download audio"
                  >
                    <MaterialIcons
                      name="download"
                      size={20}
                      color={colors.primary.light}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator color={colors.primary.light} />
      </View>
    );
  };

  const getModeLabel = (m: AudioMode) => {
    return MODES.find((mode) => mode.key === m)?.label || "Tilawat";
  };

  const miniPlayerPadding = currentTrack ? 132 : 32;

  return (
    <View className="flex-1 bg-[#0f0f0f]">
      <StatusBar barStyle="light-content" />

      {/* Mode Dropdown Modal */}
      <Modal
        visible={showModeMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModeMenu(false)}>
          <View className="flex-1 bg-black/50">
            <TouchableWithoutFeedback>
              <View className="absolute top-[72px] right-4 bg-[#1a1a1a] rounded-xl overflow-hidden shadow-lg border border-neutral-800">
                {MODES.map((m, index) => (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => switchMode(m.key)}
                    className={`px-4 py-3 flex-row items-center justify-between ${
                      index < MODES.length - 1
                        ? "border-b border-neutral-800"
                        : ""
                    } ${mode === m.key ? "bg-primary/20" : ""}`}
                    style={{ minWidth: 140 }}
                  >
                    <Text
                      className={`font-medium ${
                        mode === m.key ? "text-primary-light" : "text-white"
                      }`}
                    >
                      {m.label}
                    </Text>
                    {mode === m.key && (
                      <MaterialIcons
                        name="check"
                        size={18}
                        color={colors.primary.light}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Animated Header */}
      <Animated.View
        style={[headerAnimatedStyle]}
        className="absolute top-0 left-0 right-0 z-50 bg-[#0f0f0f]"
      >
        {/* Header with Logo, Search, and Mode Selector */}
        <View className="px-4 pb-3 pt-14">
          <View className="flex-row items-center gap-3">
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 32, height: 32 }}
              contentFit="contain"
            />
            <View className="flex-1 flex-row items-center bg-[#1a1a1a] rounded-xl px-3 gap-2">
              <MaterialIcons name="search" size={20} color="#525252" />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search audios..."
                placeholderTextColor="#525252"
                className="flex-1 py-3 text-sm text-white"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search audios"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={clearSearch}
                  accessibilityLabel="Clear search"
                >
                  <MaterialIcons name="close" size={18} color="#525252" />
                </TouchableOpacity>
              )}
            </View>

            {/* Mode Selector Button */}
            <TouchableOpacity
              onPress={() => setShowModeMenu(!showModeMenu)}
              className="bg-primary px-4 py-2.5 rounded-xl flex-row items-center gap-2"
              accessibilityLabel="Select mode"
            >
              <Text className="text-sm font-semibold text-white">
                {getModeLabel(mode)}
              </Text>
              <MaterialIcons
                name={
                  showModeMenu ? "keyboard-arrow-up" : "keyboard-arrow-down"
                }
                size={20}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View
          className="items-center justify-center flex-1"
          style={{ paddingTop: 80 }}
        >
          <ActivityIndicator size="large" color={colors.primary.light} />
          <Text className="mt-3 text-neutral-400">Loading audios...</Text>
        </View>
      ) : error ? (
        <View
          className="items-center justify-center flex-1 px-6"
          style={{ paddingTop: 80 }}
        >
          <MaterialIcons name="error-outline" size={48} color="#ef4444" />
          <Text className="mt-3 text-center text-neutral-400">{error}</Text>
          <TouchableOpacity
            onPress={() => loadAudios()}
            className="px-6 py-3 mt-4 rounded-full bg-primary"
          >
            <Text className="font-semibold text-white">Retry</Text>
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
              <Text className="mt-3 text-neutral-500">No audios found</Text>
            </View>
          }
          contentContainerStyle={{
            paddingTop: 96,
            paddingBottom: miniPlayerPadding,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <MiniPlayer />

      {/* First-time Tooltip */}
      {showTooltip && (
        <View className="absolute left-0 right-0 px-6 bottom-32">
          <View className="flex-row items-center gap-3 p-4 shadow-lg bg-primary/95 rounded-xl">
            <MaterialIcons name="info" size={24} color="white" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">
                Tip: Long press to download
              </Text>
              <Text className="mt-1 text-xs text-white/80">
                Press and hold any audio to reveal the download button
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowTooltip(false);
                AsyncStorage.setItem(TOOLTIP_KEY, "true");
              }}
            >
              <MaterialIcons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
