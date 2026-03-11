import { QuranMode, useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { MaterialIcons } from "@expo/vector-icons";
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
    isBuffering,
    isLoading,
    error,
    currentMode,
    currentTrack,
    isInitialLoad,
    play,
    pause,
    switchMode,
  } = useTrackPlayer();

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

  return (
    <View className="flex-1 bg-[#0f0f0f]">
      <StatusBar barStyle="light-content" />

      {/* Loading Overlay */}
      {isLoading && !isInitialLoad && (
        <View className="absolute inset-0 bg-[#0f0f0f]/95 z-50 items-center justify-center">
          <View className="items-center">
            <View className="w-24 h-24 bg-[#272727] rounded-full items-center justify-center mb-6">
              <MaterialIcons name="radio" size={48} color="#fbbf24" />
            </View>
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-white/90 text-lg font-semibold mt-4">
              Loading {getModeDisplayName(currentMode)}...
            </Text>
            <Text className="text-neutral-400 text-sm mt-2">Please wait</Text>
          </View>
        </View>
      )}

      {/* Header */}
      {/* Header */}
      <View className="pt-14 pb-5 px-6">
        <View className="flex-row items-center gap-3">
          <Text className="text-white/90 text-2xl font-bold">
            {getModeDisplayName(currentMode)}
          </Text>
          <View className="bg-red-500/90 px-3 py-1 rounded-full flex-row items-center">
            <View className="w-1.5 h-1.5 bg-white rounded-full mr-1.5" />
            <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
              Live
            </Text>
          </View>
        </View>

        {/* Mode Selection Buttons */}
        <View className="mt-5 flex-row gap-2">
          <TouchableOpacity
            onPress={() => switchMode("tilawat")}
            disabled={isLoading || currentMode === "tilawat"}
            className={`flex-1 py-3 px-4 rounded-full ${
              currentMode === "tilawat"
                ? "bg-emerald-600"
                : "bg-[#1a1a1a]"
            } ${isLoading && currentMode !== "tilawat" ? "opacity-50" : ""}`}
          >
            <Text
              className={`text-center font-semibold ${
                currentMode === "tilawat" ? "text-white" : "text-neutral-400"
              }`}
            >
              Tilawat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchMode("translation")}
            disabled={isLoading || currentMode === "translation"}
            className={`flex-1 py-3 px-4 rounded-full ${
              currentMode === "translation"
                ? "bg-emerald-600"
                : "bg-[#1a1a1a]"
            } ${isLoading && currentMode !== "translation" ? "opacity-50" : ""}`}
          >
            <Text
              className={`text-center font-semibold ${
                currentMode === "translation" ? "text-white" : "text-neutral-400"
              }`}
            >
              Translation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchMode("tafseer")}
            disabled={isLoading || currentMode === "tafseer"}
            className={`flex-1 py-3 px-4 rounded-full ${
              currentMode === "tafseer"
                ? "bg-emerald-600"
                : "bg-[#1a1a1a]"
            } ${isLoading && currentMode !== "tafseer" ? "opacity-50" : ""}`}
          >
            <Text
              className={`text-center font-semibold ${
                currentMode === "tafseer" ? "text-white" : "text-neutral-400"
              }`}
            >
              Tafseer
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Now Playing Card */}
        <View className="mx-6 mt-6 mb-6 bg-[#1a1a1a] rounded-3xl p-8 items-center">
          {error ? (
            <View className="items-center">
              <View className="w-20 h-20 bg-red-500/10 rounded-full items-center justify-center mb-4">
                <MaterialIcons name="warning" size={48} color="#ef4444" />
              </View>
              <Text className="text-white/90 text-lg font-semibold text-center mb-2">
                Connection Error
              </Text>
              <Text className="text-neutral-500 text-center mb-6 px-4 text-sm">
                {error.message}
              </Text>
              <TouchableOpacity
                onPress={play}
                disabled={isLoading}
                className="bg-emerald-600 px-8 py-3 rounded-full"
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
              <View className="w-32 h-32 bg-[#222222] rounded-full items-center justify-center mb-6">
                <MaterialIcons name="radio" size={64} color="#fbbf24" />
              </View>

              <TouchableOpacity
                onPress={isPlaying ? pause : play}
                disabled={isLoading}
                className={`${
                  isPlaying ? "bg-emerald-700" : "bg-emerald-600"
                } w-20 h-20 rounded-full items-center justify-center`}
              >
                <MaterialIcons
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={40}
                  color="white"
                />
              </TouchableOpacity>

              {isBuffering && (
                <View className="mt-3 flex-row items-center">
                  <ActivityIndicator color="#10b981" size="small" />
                  <Text className="text-neutral-400 text-xs ml-2">
                    Buffering...
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
