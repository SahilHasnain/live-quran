import { FullPlayerModal } from "@/components/FullPlayerModal";
import { colors } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
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
    browseProgressPercent,
    pauseBrowse,
    play,
    stopBrowse,
  } = useTrackPlayer();

  const animatedStyle = useAnimatedStyle(() => ({
    // Keep mini player within safe area when tab bar hides.
    transform: [
      {
        translateY: Math.max(
          0,
          Math.min(translateY.value, TAB_BAR_BASE_HEIGHT),
        ),
      },
    ],
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
            left: 0,
            right: 0,
            bottom: TAB_BAR_BASE_HEIGHT + insets.bottom,
            zIndex: 40,
          },
          animatedStyle,
        ]}
        pointerEvents="box-none"
      >
        <View className="border border-black/45 bg-[#080f0a]/95 px-3.5 py-2.5 shadow-lg">
          <View
            className="absolute top-0 left-0 right-0 bg-white/5"
            style={{ height: 1 }}
          >
            <View
              className="h-full bg-green-400/70"
              style={{ width: `${browseProgressPercent}%` }}
            />
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setIsFullPlayerVisible(true)}
              className="flex-row items-center flex-1"
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open full player"
            >
              <Image
                source={thumbnailSource}
                style={{ width: 80, aspectRatio: 16 / 9, borderRadius: 8 }}
                contentFit="cover"
                transition={200}
              />

              <View className="flex-1 ml-3">
                <Text
                  className="text-[13px] font-medium text-white/95"
                  numberOfLines={1}
                >
                  {currentTrack.title}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void (isBrowsePlaying ? pauseBrowse() : play());
              }}
              accessibilityRole="button"
              accessibilityLabel={
                isBrowsePlaying ? "Pause audio" : "Resume audio"
              }
              className="items-center justify-center w-10 h-10 rounded-full border border-primary/30"
              activeOpacity={0.8}
            >
              {isBrowseBuffering ? (
                <ActivityIndicator size="small" color={colors.primary.light} />
              ) : (
                <MaterialIcons
                  name={isBrowsePlaying ? "pause" : "play-arrow"}
                  size={26}
                  color="white"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsFullPlayerVisible(false);
                void stopBrowse();
              }}
              accessibilityRole="button"
              accessibilityLabel="Close mini player"
              className="items-center justify-center border rounded-full h-9 w-9 border-black/35 bg-black/30"
              activeOpacity={0.85}
            >
              <MaterialIcons name="close" size={18} color="#cfcfcf" />
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
