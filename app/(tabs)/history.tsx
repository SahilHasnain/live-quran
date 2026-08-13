import { MiniPlayer } from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { formatDuration, type AudioMode } from "@/services/appwrite";
import {
  historyManager,
  type HistoryEntry,
} from "@/services/historyManager";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

const MODES: { key: AudioMode; label: string }[] = [
  { key: "tilawat", label: "Tilawat" },
  { key: "translation", label: "Translation" },
  { key: "tafseer", label: "Tafseer" },
];
const MODE_KEY = "@mode_history";

function formatPlayedAt(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Played recently";
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default function HistoryScreen() {
  const { playTrack, currentTrack, isPlaying, play, pause } = useTrackPlayer();
  const {
    handleScroll: handleHeaderScroll,
    translateY: headerTranslateY,
    showHeader,
  } = useHeaderVisibility();
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const [mode, setMode] = useState<AudioMode | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>(
    {},
  );

  const loadHistory = useCallback(async () => {
    setLoading(true);
    await historyManager.initialize();
    setHistory(historyManager.getAllHistory());
    setLoading(false);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((saved) => {
      setMode((saved as AudioMode) || "tilawat");
    });
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useFocusEffect(
    useCallback(() => {
      showHeader();
      loadHistory();
    }, [showHeader, loadHistory]),
  );

  const filteredHistory = useMemo(() => {
    const selectedMode = mode ?? "tilawat";
    const query = searchQuery.trim().toLowerCase();

    return history.filter((item) => {
      const matchesMode = item.mode === selectedMode;
      const matchesSearch =
        query.length === 0 || item.title.toLowerCase().includes(query);
      return matchesMode && matchesSearch;
    });
  }, [history, mode, searchQuery]);

  useEffect(() => {
    if (filteredHistory.length === 0) {
      setAudioProgress({});
      return;
    }

    const keys = filteredHistory.map((item) => `@audio_progress_${item.id}`);
    AsyncStorage.multiGet(keys).then((pairs) => {
      const map: Record<string, number> = {};
      pairs.forEach(([key, value]) => {
        if (!value) return;
        try {
          const { position, duration } = JSON.parse(value) as {
            position?: number;
            duration?: number;
          };
          if (duration && duration > 0 && position && position > 0) {
            map[key.replace("@audio_progress_", "")] = Math.min(
              (position / duration) * 100,
              100,
            );
          }
        } catch {
          // ignore malformed progress entries
        }
      });
      setAudioProgress(map);
    });
  }, [filteredHistory]);

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

  const handlePlay = (item: HistoryEntry) => {
    if (currentTrack?.id === item.id && isPlaying) {
      pause();
      return;
    }

    if (currentTrack?.id === item.id && !isPlaying) {
      play();
      return;
    }

    playTrack(
      {
        id: item.id,
        title: item.title,
        duration: item.duration,
        fileId: item.fileId,
        thumbnail: item.thumbnail || null,
        youtubeId: "",
        uploader: null,
      },
      item.mode,
    );
  };

  const handleScroll = (event: any) => {
    handleHeaderScroll(event);
    handleTabBarScroll(event);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const getModeLabel = (m: AudioMode) => {
    return MODES.find((item) => item.key === m)?.label || "Tilawat";
  };

  const miniPlayerPadding = currentTrack ? 132 : 32;

  if (mode === null) return null;

  return (
    <View className="flex-1 bg-[#0a0e1c]">
      <StatusBar barStyle="light-content" />

      <Modal
        visible={showModeMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModeMenu(false)}>
          <View className="flex-1 bg-black/50">
            <TouchableWithoutFeedback>
              <View className="absolute top-[72px] right-4 bg-[#131b2e] rounded-xl overflow-hidden shadow-lg border border-neutral-800">
                {MODES.map((item, index) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => switchMode(item.key)}
                    className={`px-4 py-3 flex-row items-center justify-between ${
                      index < MODES.length - 1
                        ? "border-b border-neutral-800"
                        : ""
                    } ${mode === item.key ? "bg-primary/20" : ""}`}
                    style={{ minWidth: 140 }}
                  >
                    <Text
                      className={`font-medium ${
                        mode === item.key ? "text-primary-light" : "text-white"
                      }`}
                    >
                      {item.label}
                    </Text>
                    {mode === item.key && (
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

      <Animated.View
        style={[headerAnimatedStyle]}
        className="absolute top-0 left-0 right-0 z-50 bg-[#0a0e1c]"
      >
        <View className="px-4 pb-3 pt-14">
          <View className="flex-row items-center gap-3">
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 32, height: 32 }}
              contentFit="contain"
            />
            <View className="flex-1 flex-row items-center bg-[#131b2e] rounded-xl px-3 gap-2">
              <MaterialIcons name="search" size={20} color="#525252" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search history..."
                placeholderTextColor="#525252"
                className="flex-1 py-3 text-sm text-white"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search history"
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

          <View className="px-1 mt-3">
            <Text className="text-lg font-semibold text-white">
              Recently Played
            </Text>
          </View>
        </View>
      </Animated.View>

      {loading ? (
        <View
          className="items-center justify-center flex-1"
          style={{ paddingTop: 120 }}
        >
          <ActivityIndicator size="large" color={colors.primary.light} />
          <Text className="mt-3 text-neutral-400">Loading history...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={filteredHistory}
          keyExtractor={(item) => `${item.mode}-${item.id}`}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <MaterialIcons name="history" size={64} color="#525252" />
              <Text className="mt-4 text-lg font-medium text-neutral-500">
                No history yet
              </Text>
              <Text className="px-8 mt-2 text-center text-neutral-600">
                Audios you play from Browse or Downloads will appear here
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCurrentlyPlaying = currentTrack?.id === item.id && isPlaying;
            const progressPercent = audioProgress[item.id] ?? 0;

            return (
              <View className="px-4 py-2">
                <TouchableOpacity
                  onPress={() => handlePlay(item)}
                  activeOpacity={0.7}
                  className="flex-row items-start gap-4"
                >
                  <View>
                    <Image
                      source={
                        item.thumbnail
                          ? { uri: item.thumbnail }
                          : require("@/assets/images/icon.png")
                      }
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
                    {progressPercent > 0 && (
                      <View
                        className="absolute bottom-0 left-0 right-0 overflow-hidden"
                        style={{
                          height: 3,
                          borderBottomLeftRadius: 8,
                          borderBottomRightRadius: 8,
                        }}
                      >
                        <View className="absolute inset-0 bg-black/40" />
                        <View
                          className="h-full bg-green-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </View>
                    )}
                    <View className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded">
                      <Text className="text-xs font-semibold text-white">
                        {formatDuration(item.duration)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-1 gap-2 pr-2">
                    <Text
                      className={`text-base font-medium ${
                        isCurrentlyPlaying ? "text-primary-light" : "text-white"
                      }`}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-xs text-neutral-500">
                      {formatPlayedAt(item.playedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
          contentContainerStyle={{
            paddingTop: 130,
            paddingBottom: miniPlayerPadding,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <MiniPlayer />
    </View>
  );
}
