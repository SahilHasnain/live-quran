import { FullPlayerModal } from "@/components/FullPlayerModal";
import { colors } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { formatDuration } from "@/services/appwrite";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_BASE_HEIGHT = 56;

export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const { translateY } = useTabBarVisibility();
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
  const {
    currentTrack,
    isBrowsePlaying,
    isBrowseBuffering,
    pauseBrowse,
    play,
  } = useTrackPlayer();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (!currentTrack && isFullPlayerVisible) {
      setIsFullPlayerVisible(false);
    }
  }, [currentTrack, isFullPlayerVisible]);

  if (!currentTrack) {
    return null;
  }

  const thumbnailSource = currentTrack.thumbnail
    ? { uri: currentTrack.thumbnail }
    : require("@/assets/images/icon.png");

  return (
    <>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 12,
            right: 12,
            bottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 8,
            zIndex: 40,
          },
          animatedStyle,
        ]}
        pointerEvents="box-none"
      >
        <View className="rounded-2xl border border-neutral-800 bg-[#141414] px-3 py-2 shadow-lg">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setIsFullPlayerVisible(true)}
              className="flex-1 flex-row items-center"
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open full player"
            >
              <Image
                source={thumbnailSource}
                style={{ width: 44, height: 44, borderRadius: 8 }}
                contentFit="cover"
                transition={200}
              />

              <View className="ml-3 flex-1">
                <Text className="text-[10px] uppercase tracking-widest text-primary-light/90">
                  Now Playing
                </Text>
                <Text className="mt-0.5 text-white" numberOfLines={1}>
                  {currentTrack.title}
                </Text>
                <Text className="mt-0.5 text-xs text-neutral-400">
                  {formatDuration(currentTrack.duration)}
                </Text>
              </View>

              <MaterialIcons
                name="keyboard-arrow-up"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void (isBrowsePlaying ? pauseBrowse() : play());
              }}
              accessibilityRole="button"
              accessibilityLabel={
                isBrowsePlaying ? "Pause audio" : "Resume audio"
              }
              className="ml-3 h-10 w-10 items-center justify-center rounded-full bg-primary/20"
              activeOpacity={0.8}
            >
              {isBrowseBuffering ? (
                <ActivityIndicator size="small" color={colors.primary.light} />
              ) : (
                <MaterialIcons
                  name={isBrowsePlaying ? "pause" : "play-arrow"}
                  size={24}
                  color={colors.primary.light}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <FullPlayerModal
        visible={isFullPlayerVisible}
        onClose={() => setIsFullPlayerVisible(false)}
      />
    </>
  );
}
