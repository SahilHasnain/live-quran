import { MiniPlayer } from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { formatDuration, type AudioMode } from "@/services/appwrite";
import { historyManager, type HistoryEntry } from "@/services/historyManager";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const MODE_KEY = "@mode_history";
const MODES: { key: AudioMode; label: string }[] = [
  { key: "tilawat", label: "Tilawat" },
  { key: "translation", label: "Translation" },
  { key: "tafseer", label: "Tafseer" },
];

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

export default function HistoryWebScreen() {
  const { playTrack, currentTrack, isPlaying, play, pause } = useTrackPlayer();
  const [mode, setMode] = useState<AudioMode | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((saved) => {
      setMode((saved as AudioMode) || "tilawat");
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await historyManager.initialize();
      setHistory(historyManager.getAllHistory());
      setLoading(false);
    };
    load();
  }, []);

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
          // ignore malformed entries
        }
      });
      setAudioProgress(map);
    });
  }, [filteredHistory]);

  const handlePlay = (item: HistoryEntry) => {
    if (currentTrack?.id === item.id && isPlaying) {
      void pause();
      return;
    }
    if (currentTrack?.id === item.id && !isPlaying) {
      void play();
      return;
    }
    void playTrack(
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

  const switchMode = (newMode: AudioMode) => {
    setMode(newMode);
    AsyncStorage.setItem(MODE_KEY, newMode);
  };

  if (mode === null) return null;

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 40, paddingBottom: currentTrack ? 140 : 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 flex-row items-start justify-between">
          <View className="max-w-[700px]">
            <Text className="text-4xl font-bold leading-[48px] text-white">
              History
            </Text>
          </View>

          <View className="w-[360px] rounded-[28px] border border-white/10 bg-[#0a140e] p-5">
            <View className="mt-4 flex-row items-center rounded-2xl border border-white/10 bg-black/20 px-4">
              <MaterialIcons name="search" size={20} color="#737373" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search history..."
                placeholderTextColor="#737373"
                className="flex-1 py-4 pl-3 text-sm text-white"
              />
            </View>
          </View>
        </View>

        <View className="mb-8 flex-row gap-4">
          {MODES.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => switchMode(item.key)}
              className={`rounded-full px-5 py-3 ${
                mode === item.key ? "bg-emerald-500" : "bg-white/5"
              }`}
            >
              <Text className="text-sm font-semibold text-white">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View className="items-center justify-center py-24">
            <ActivityIndicator size="large" color={colors.primary.light} />
            <Text className="mt-4 text-neutral-400">Loading history...</Text>
          </View>
        ) : filteredHistory.length === 0 ? (
          <View className="rounded-[28px] border border-white/10 bg-[#0a140e] p-12">
            <MaterialIcons name="history" size={52} color="#737373" />
            <Text className="mt-4 text-xl font-semibold text-white">No history yet</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {filteredHistory.map((item) => {
              const isCurrentlyPlaying = currentTrack?.id === item.id && isPlaying;
              const progressPercent = audioProgress[item.id] ?? 0;
              return (
                <TouchableOpacity
                  key={`${item.mode}-${item.id}`}
                  onPress={() => handlePlay(item)}
                  activeOpacity={0.85}
                  className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#09130d]"
                  style={{ width: "48.5%" }}
                >
                  <View className="flex-row">
                    <View style={{ width: 260 }}>
                      <View style={{ width: "100%", aspectRatio: 16 / 9 }}>
                      <Image
                        source={
                          item.thumbnail
                            ? { uri: item.thumbnail }
                            : require("@/assets/images/icon.png")
                        }
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                        transition={200}
                      />
                      </View>
                      {progressPercent > 0 && (
                        <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                          <View
                            className="h-full bg-emerald-400"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </View>
                      )}
                    </View>

                    <View className="flex-1 justify-between p-6">
                      <View>
                        <Text
                          className={`text-lg font-semibold ${
                            isCurrentlyPlaying ? "text-primary-light" : "text-white"
                          }`}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        <Text className="mt-3 text-sm text-neutral-400">
                          {formatPlayedAt(item.playedAt)}
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-neutral-500">
                          {formatDuration(item.duration)}
                        </Text>
                        <MaterialIcons
                          name={isCurrentlyPlaying ? "equalizer" : "play-circle-filled"}
                          size={28}
                          color={isCurrentlyPlaying ? colors.primary.light : "#d4d4d4"}
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <MiniPlayer />
    </View>
  );
}
