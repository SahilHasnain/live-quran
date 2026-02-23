import { QuranMode, useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const {
    isPlaying,
    isLoading,
    error,
    currentMode,
    currentTrack,
    isInitialLoad,
    play,
    pause,
    switchMode,
  } = useTrackPlayer();

  // Get display name for mode
  const getModeDisplayName = (mode: QuranMode) => {
    switch (mode) {
      case "tilawat":
        return "Tilawat Radio";
      case "tafseer":
        return "Tafseer Radio";
      case "translation":
        return "Translation Radio";
      default:
        return "Quran Radio";
    }
  };

  // Auto-play on mount
  useEffect(() => {
    play();
  }, [play]);

  return (
    <View className="flex-1 bg-emerald-950">
      <StatusBar barStyle="light-content" />

      {/* Loading Overlay for Mode Switches */}
      {isLoading && !isInitialLoad && (
        <View className="absolute inset-0 bg-emerald-950/95 z-50 items-center justify-center">
          <View className="items-center">
            <View className="w-24 h-24 bg-emerald-800 rounded-full items-center justify-center mb-6">
              <MaterialIcons name="radio" size={48} color="#fbbf24" />
            </View>
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-white text-lg font-semibold mt-4">
              Loading {getModeDisplayName(currentMode)}...
            </Text>
            <Text className="text-emerald-300 text-sm mt-2">Please wait</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View className="pt-14 pb-6 px-6 bg-emerald-900/30">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-3xl font-bold">
              {getModeDisplayName(currentMode)}
            </Text>
            <Text className="text-emerald-300 text-sm mt-1">
              24/7 Live Stream
            </Text>
          </View>
          <View className="bg-red-600 px-4 py-2 rounded-full flex-row items-center">
            <View className="w-2 h-2 bg-white rounded-full mr-2" />
            <Text className="text-white text-xs font-bold uppercase tracking-wider">
              Live
            </Text>
          </View>
        </View>

        {/* Mode Selection Buttons */}
        <View className="mt-6 flex-row gap-2">
          <TouchableOpacity
            onPress={() => switchMode("tilawat")}
            disabled={isLoading || currentMode === "tilawat"}
            className={`flex-1 py-3 px-4 rounded-full ${
              currentMode === "tilawat"
                ? "bg-emerald-600"
                : "bg-emerald-800/50 border border-emerald-700"
            } ${isLoading ? "opacity-50" : ""}`}
          >
            {isLoading && currentMode !== "tilawat" ? (
              <ActivityIndicator size="small" color="#6ee7b7" />
            ) : (
              <Text
                className={`text-center font-semibold ${
                  currentMode === "tilawat" ? "text-white" : "text-emerald-300"
                }`}
              >
                Tilawat
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchMode("translation")}
            disabled={isLoading || currentMode === "translation"}
            className={`flex-1 py-3 px-4 rounded-full ${
              currentMode === "translation"
                ? "bg-emerald-600"
                : "bg-emerald-800/50 border border-emerald-700"
            } ${isLoading ? "opacity-50" : ""}`}
          >
            {isLoading && currentMode !== "translation" ? (
              <ActivityIndicator size="small" color="#6ee7b7" />
            ) : (
              <Text
                className={`text-center font-semibold ${
                  currentMode === "translation"
                    ? "text-white"
                    : "text-emerald-300"
                }`}
              >
                Translation
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchMode("tafseer")}
            disabled={isLoading || currentMode === "tafseer"}
            className={`flex-1 py-3 px-4 rounded-full ${
              currentMode === "tafseer"
                ? "bg-emerald-600"
                : "bg-emerald-800/50 border border-emerald-700"
            } ${isLoading ? "opacity-50" : ""}`}
          >
            {isLoading && currentMode !== "tafseer" ? (
              <ActivityIndicator size="small" color="#6ee7b7" />
            ) : (
              <Text
                className={`text-center font-semibold ${
                  currentMode === "tafseer" ? "text-white" : "text-emerald-300"
                }`}
              >
                Tafseer
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Now Playing Card */}
        <View className="mx-6 mt-6 mb-6 bg-emerald-900/50 rounded-3xl p-8 items-center border border-emerald-800/30">
          {error ? (
            <View className="items-center">
              <View className="w-20 h-20 bg-red-500/10 rounded-full items-center justify-center mb-4">
                <MaterialIcons name="warning" size={48} color="#ef4444" />
              </View>
              <Text className="text-white text-lg font-semibold text-center mb-2">
                Connection Error
              </Text>
              <Text className="text-emerald-300 text-center mb-6 px-4 text-sm">
                {error.message}
              </Text>
              <TouchableOpacity
                onPress={play}
                disabled={isLoading}
                className="bg-emerald-600 px-8 py-3 rounded-full shadow-lg"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Try Again
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="w-32 h-32 bg-emerald-800 rounded-full items-center justify-center mb-6 shadow-xl">
                <MaterialIcons name="radio" size={64} color="#fbbf24" />
              </View>

              <TouchableOpacity
                onPress={isPlaying ? pause : play}
                disabled={isLoading}
                className={`${
                  isPlaying ? "bg-emerald-700" : "bg-emerald-600"
                } w-20 h-20 rounded-full items-center justify-center shadow-xl`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="large" />
                ) : (
                  <MaterialIcons
                    name={isPlaying ? "pause" : "play-arrow"}
                    size={40}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
