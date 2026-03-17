import { MiniPlayer } from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { formatDuration, type AudioMode } from "@/services/appwrite";
import {
  downloadManager,
  type DownloadedAudio,
} from "@/services/downloadManager";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const MODES: { key: AudioMode; label: string }[] = [
  { key: "tilawat", label: "Tilawat" },
  { key: "translation", label: "Translation" },
  { key: "tafseer", label: "Tafseer" },
];
const MODE_KEY = "@mode_downloads";

// Swipeable card component
function SwipeableDownloadCard({
  item,
  onPress,
  onDelete,
  isCurrentlyPlaying,
}: {
  item: DownloadedAudio;
  onPress: () => void;
  onDelete: () => void;
  isCurrentlyPlaying: boolean;
}) {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handleDelete = useCallback(() => {
    // Animate out and delete
    translateX.value = withTiming(-500, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    itemHeight.value = withTiming(0, { duration: 300 }, (finished) => {
      "worklet";
      if (finished) {
        runOnJS(onDelete)();
      }
    });
  }, [onDelete, translateX, opacity, itemHeight]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe (negative translation)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -80);
      }
    })
    .onEnd((event) => {
      const shouldRevealDelete = event.translationX < -40;

      if (shouldRevealDelete) {
        // Snap to reveal delete icon
        translateX.value = withSpring(-80);
      } else {
        // Snap back
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    height: itemHeight.value === 0 ? 0 : undefined,
    opacity: opacity.value,
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  return (
    <View className="relative mb-3">
      {/* Delete icon */}
      <Animated.View
        style={deleteButtonStyle}
        className="absolute top-0 bottom-0 z-10 justify-center right-6"
      >
        <Pressable
          onPress={handleDelete}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="delete" size={24} color="#ef4444" />
        </Pressable>
      </Animated.View>

      {/* Swipeable card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <View className="flex-row items-start gap-4">
            {/* Thumbnail */}
            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.7}
              accessibilityLabel={`Play ${item.title}`}
              accessibilityRole="button"
            >
              <View>
                <Image
                  source={{
                    uri: item.thumbnail || require("@/assets/images/icon.png"),
                  }}
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
            </TouchableOpacity>

            {/* Text Content */}
            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.7}
              className="flex-1 gap-1.5"
              accessibilityLabel={`Play ${item.title}`}
              accessibilityRole="button"
            >
              <Text
                className={`text-base font-medium ${isCurrentlyPlaying ? "text-primary-light" : "text-white"}`}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <MaterialIcons
                  name="check-circle"
                  size={14}
                  color={colors.primary.light}
                />
                <Text className="text-xs font-medium text-primary-light">
                  Saved
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function DownloadsScreen() {
  const { playTrack, currentTrack, isPlaying, play, pause } = useTrackPlayer();
  const {
    handleScroll: handleHeaderScroll,
    translateY: headerTranslateY,
    showHeader,
  } = useHeaderVisibility();
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const [mode, setMode] = useState<AudioMode | null>(null);
  const [downloads, setDownloads] = useState<DownloadedAudio[]>([]);
  const [filteredDownloads, setFilteredDownloads] = useState<DownloadedAudio[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load persisted mode on mount
  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((saved) => {
      setMode((saved as AudioMode) || "tilawat");
    });
  }, []);

  // Load downloads
  const loadDownloads = useCallback(() => {
    setLoading(true);
    const allDownloads = downloadManager.getAllDownloads();
    setDownloads(allDownloads);

    // Filter by mode
    const filtered = allDownloads.filter((d) => d.mode === (mode ?? "tilawat"));
    setFilteredDownloads(filtered);
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  useFocusEffect(
    useCallback(() => {
      showHeader();
      loadDownloads();
    }, [showHeader, loadDownloads]),
  );

  // Filter downloads by search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      const filtered = downloads.filter((d) => d.mode === mode);
      setFilteredDownloads(filtered);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = downloads.filter(
        (d) => d.mode === mode && d.title.toLowerCase().includes(query),
      );
      setFilteredDownloads(filtered);
    }
  }, [searchQuery, downloads, mode]);

  const switchMode = (newMode: AudioMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    AsyncStorage.setItem(MODE_KEY, newMode);
    setSearchQuery("");
    setShowModeMenu(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handlePlay = (item: DownloadedAudio) => {
    // If this track is currently playing, toggle pause/play
    if (currentTrack?.id === item.id && isPlaying) {
      pause();
    } else if (currentTrack?.id === item.id && !isPlaying) {
      play();
    } else {
      // Play downloaded track (use local URI)
      playTrack(
        {
          id: item.id,
          title: item.title,
          duration: item.duration,
          fileId: item.localUri, // Use local file path
          thumbnail: item.thumbnail || null,
          youtubeId: "",
          uploader: null,
        },
        item.mode,
      );
    }
  };

  const handleDelete = async (item: DownloadedAudio) => {
    const success = await downloadManager.deleteDownload(item.id);
    if (success) {
      loadDownloads();
    }
  };

  const handleScroll = (event: any) => {
    handleHeaderScroll(event);
    handleTabBarScroll(event);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const getModeLabel = (m: AudioMode) => {
    return MODES.find((mode) => mode.key === m)?.label || "Tilawat";
  };

  const miniPlayerPadding = currentTrack ? 132 : 32;

  if (mode === null) return null;

  const renderItem = ({ item }: { item: DownloadedAudio }) => {
    const isCurrentlyPlaying = currentTrack?.id === item.id && isPlaying;

    return (
      <View className="px-4 py-2">
        <SwipeableDownloadCard
          item={item}
          onPress={() => handlePlay(item)}
          onDelete={() => handleDelete(item)}
          isCurrentlyPlaying={isCurrentlyPlaying}
        />
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-[#080f0a]">
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
                <View className="absolute top-[72px] right-4 bg-[#0f1a12] rounded-xl overflow-hidden shadow-lg border border-neutral-800">
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
          className="absolute top-0 left-0 right-0 z-50 bg-[#080f0a]"
        >
          {/* Header with Logo, Search, and Mode Selector */}
          <View className="px-4 pb-3 pt-14">
            <View className="flex-row items-center gap-3">
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: 32, height: 32 }}
                contentFit="contain"
              />
              <View className="flex-1 flex-row items-center bg-[#0f1a12] rounded-xl px-3 gap-2">
                <MaterialIcons name="search" size={20} color="#525252" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search downloads..."
                  placeholderTextColor="#525252"
                  className="flex-1 py-3 text-sm text-white"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  accessibilityLabel="Search downloads"
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

            {/* Title */}
            <View className="px-1 mt-3">
              <Text className="text-lg font-semibold text-white">
                Your Downloads
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Content */}
        {loading ? (
          <View
            className="items-center justify-center flex-1"
            style={{ paddingTop: 120 }}
          >
            <ActivityIndicator size="large" color={colors.primary.light} />
            <Text className="mt-3 text-neutral-400">Loading downloads...</Text>
          </View>
        ) : (
          <Animated.FlatList
            data={filteredDownloads}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View className="items-center justify-center py-16">
                <MaterialIcons name="download-done" size={64} color="#525252" />
                <Text className="mt-4 text-lg font-medium text-neutral-500">
                  No downloads yet
                </Text>
                <Text className="px-8 mt-2 text-center text-neutral-600">
                  Download audios from the Browse tab to listen offline
                </Text>
              </View>
            }
            contentContainerStyle={{
              paddingTop: 130,
              paddingBottom: miniPlayerPadding,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <MiniPlayer />
      </View>
    </GestureHandlerRootView>
  );
}
