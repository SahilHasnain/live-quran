import { colors } from "@/constants/theme";
import { QuranMode, useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MODES: { key: QuranMode; label: string }[] = [
  {
    key: "tilawat",
    label: "Tilawat",
  },
  {
    key: "translation",
    label: "Translation",
  },
  {
    key: "tafseer",
    label: "Tafseer",
  },
];

export default function LiveWebScreen() {
  const {
    isLivePlaying,
    isLiveBuffering,
    isLiveLoading,
    liveError,
    currentMode,
    playLive,
    pauseLive,
    switchMode,
  } = useTrackPlayer();
  const [hoveredMode, setHoveredMode] = useState<QuranMode | null>(null);

  const activeMode = MODES.find((mode) => mode.key === currentMode) ?? MODES[0];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 px-10 py-10">
        <View className="mb-8 flex-row items-start justify-between">
          <View className="max-w-[640px]">
            <Text className="text-4xl font-bold leading-[48px] text-white">
              Live
            </Text>
          </View>

          <View className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-5 py-3">
            <Text className="text-sm font-semibold uppercase tracking-[1.8px] text-emerald-200">
              {isLivePlaying ? "On Air" : "Standby"}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-8">
          <View className="flex-1 overflow-hidden rounded-[32px] border border-white/10 bg-[#0a140e]">
            <View className="relative p-8">
              <View className="absolute right-[-40px] top-[-20px] h-[220px] w-[220px] rounded-full bg-emerald-400/10" />
              <View className="absolute bottom-[-80px] left-[-20px] h-[240px] w-[240px] rounded-full bg-amber-400/10" />

              <View className="relative">
                <View className="mb-8 flex-row items-center justify-between">
                  <View>
                    <Text className="text-3xl font-bold text-white">
                      {activeMode.label} Radio
                    </Text>
                  </View>

                  <Image
                    source={require("@/assets/images/headphone-v1.png")}
                    style={{ width: 112, height: 112 }}
                    contentFit="contain"
                    transition={200}
                  />
                </View>

                {liveError ? (
                  <View className="rounded-[28px] border border-red-500/30 bg-red-500/10 p-6">
                    <View className="flex-row items-center">
                      <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
                        <MaterialIcons name="warning" size={26} color="#f87171" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-white">
                          Live stream unavailable
                        </Text>
                        <Text className="mt-1 text-sm text-red-100/70">
                          {liveError.message}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                    <View className="mb-8 flex-row items-center">
                      <View className="mr-4 h-3 w-3 rounded-full bg-emerald-400" />
                      <Text className="text-sm font-medium text-neutral-300">
                        {isLivePlaying
                          ? "Streaming now"
                          : isLiveBuffering
                            ? "Buffering stream"
                            : "Ready to start"}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <TouchableOpacity
                        onPress={isLivePlaying ? pauseLive : playLive}
                        disabled={isLiveLoading}
                        className="h-20 w-20 items-center justify-center rounded-full bg-emerald-500"
                      >
                        {isLiveLoading ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <MaterialIcons
                            name={isLivePlaying ? "pause" : "play-arrow"}
                            size={42}
                            color="white"
                          />
                        )}
                      </TouchableOpacity>

                      <View className="ml-6 flex-1">
                        <Text className="text-2xl font-semibold text-white">
                          {isLivePlaying ? "Listening live" : "Press play to start"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View className="w-[380px]">
            {MODES.map((mode) => {
              const isActive = mode.key === currentMode;
              const isHovered = hoveredMode === mode.key;

              return (
                <TouchableOpacity
                  key={mode.key}
                  onPress={() => void switchMode(mode.key)}
                  onPressIn={() => setHoveredMode(mode.key)}
                  onPressOut={() => setHoveredMode(null)}
                  className={`mb-4 rounded-[28px] border p-5 ${
                    isActive
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/10 bg-[#0a140e]"
                  }`}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                      <Text
                        className={`text-xl font-semibold ${
                          isActive ? "text-white" : "text-neutral-200"
                        }`}
                      >
                        {mode.label}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={isActive || isHovered ? "radio" : "radio-button-unchecked"}
                      size={22}
                      color={isActive ? colors.primary.light : "#737373"}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
