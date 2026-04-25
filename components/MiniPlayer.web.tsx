import { FullPlayerModal } from "@/components/FullPlayerModal";
import { colors } from "@/constants/theme";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export function MiniPlayer() {
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
  const {
    currentTrack,
    isBrowsePlaying,
    isBrowseBuffering,
    browseProgressPercent,
    pauseBrowse,
    play,
    stopBrowse,
  } = useTrackPlayer();

  if (!currentTrack) {
    return null;
  }

  const thumbnailSource = currentTrack.thumbnail
    ? { uri: currentTrack.thumbnail }
    : require("@/assets/images/icon.png");

  return (
    <>
      <View
        className="z-50 w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[#08110b]/95 shadow-2xl"
        style={{ position: "fixed", bottom: 24, right: 24 }}
      >
        <View className="h-1 bg-white/5">
          <View
            className="h-full bg-emerald-400"
            style={{ width: `${browseProgressPercent}%` }}
          />
        </View>

        <View className="p-4">
          <TouchableOpacity
            onPress={() => setIsFullPlayerVisible(true)}
            activeOpacity={0.85}
            className="flex-row items-center"
          >
            <Image
              source={thumbnailSource}
              style={{ width: 128, height: 72, borderRadius: 16 }}
              contentFit="cover"
              transition={200}
            />

            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-white" numberOfLines={2}>
                {currentTrack.title}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="mt-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => {
                void (isBrowsePlaying ? pauseBrowse() : play());
              }}
              className="h-12 w-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10"
            >
              {isBrowseBuffering ? (
                <ActivityIndicator size="small" color={colors.primary.light} />
              ) : (
                <MaterialIcons
                  name={isBrowsePlaying ? "pause" : "play-arrow"}
                  size={28}
                  color="white"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsFullPlayerVisible(true)}
              className="rounded-full border border-white/10 px-4 py-2"
            >
              <Text className="text-sm font-medium text-neutral-200">Open Player</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsFullPlayerVisible(false);
                void stopBrowse();
              }}
              className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
            >
              <MaterialIcons name="close" size={18} color="#d4d4d4" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FullPlayerModal
        visible={isFullPlayerVisible}
        onClose={() => setIsFullPlayerVisible(false)}
      />
    </>
  );
}
