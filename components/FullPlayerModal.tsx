import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { formatDuration } from "@/services/appwrite";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import TrackPlayer, {
  useProgress,
} from "@weights-ai/react-native-track-player";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FullPlayerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FullPlayerModal({ visible, onClose }: FullPlayerModalProps) {
  const insets = useSafeAreaInsets();
  const [seekBarWidth, setSeekBarWidth] = useState(0);
  const progress = useProgress(250);
  const {
    currentTrack,
    isBrowsePlaying,
    isBrowseBuffering,
    pauseBrowse,
    play,
    isAutoplay,
    setIsAutoplay,
  } = useTrackPlayer();

  if (!currentTrack) {
    return null;
  }

  const resolvedDuration =
    progress.duration > 0 ? progress.duration : currentTrack.duration;
  const safeDuration = Number.isFinite(resolvedDuration)
    ? resolvedDuration
    : currentTrack.duration;
  const safePosition = Number.isFinite(progress.position)
    ? Math.min(Math.max(progress.position, 0), safeDuration)
    : 0;
  const progressPercent =
    safeDuration > 0 ? Math.min((safePosition / safeDuration) * 100, 100) : 0;
  const remainingSeconds = Math.max(safeDuration - safePosition, 0);

  const handleSeekPress = (event: GestureResponderEvent) => {
    if (safeDuration <= 0 || seekBarWidth <= 0) {
      return;
    }

    const tapX = Math.min(
      Math.max(event.nativeEvent.locationX, 0),
      seekBarWidth,
    );
    const nextPosition = (tapX / seekBarWidth) * safeDuration;
    void TrackPlayer.seekTo(nextPosition);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#080f0a]">
        <Image
          source={require("@/assets/images/quran-bg-v2.jpg")}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          blurRadius={28}
          transition={200}
        />
        <Image
          source={require("@/assets/images/quran-bg-v2.jpg")}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
          contentPosition="center"
          transition={200}
        />
        <LinearGradient
          colors={["rgba(3,8,5,0.14)", "rgba(3,8,5,0.28)", "rgba(8,15,10,0.56)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={["rgba(7,14,9,0.22)", "rgba(7,14,9,0.03)", "rgba(7,14,9,0.4)"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          <View
            className="absolute z-20 left-6"
            style={{ top: insets.top + 10 }}
          >
            <TouchableOpacity
              onPress={() => setIsAutoplay(!isAutoplay)}
              className={`h-10 px-4 items-center justify-center rounded-full border border-black/40 ${
                isAutoplay ? "bg-emerald-400/10" : "bg-black/35"
              }`}
              accessibilityRole="button"
              accessibilityLabel={
                isAutoplay ? "Disable autoplay" : "Enable autoplay"
              }
            >
              <Text
                className={`text-sm font-semibold ${
                  isAutoplay ? "text-emerald-200" : "text-white/75"
                }`}
              >
                Autoplay
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-6 pb-8">
            <View className="items-center justify-end flex-1">
              <View className="w-full max-w-[420px]">
                <Text className="text-center text-[30px] font-semibold leading-10 text-white">
                  {currentTrack.title}
                </Text>
              </View>

              <View className="w-full mt-8">
                <Pressable
                  onLayout={(event) => {
                    setSeekBarWidth(event.nativeEvent.layout.width);
                  }}
                  onPress={handleSeekPress}
                  className="justify-center h-5"
                  accessibilityRole="adjustable"
                  accessibilityLabel="Seek audio position"
                  accessibilityHint="Tap the progress bar to jump to a specific time"
                >
                  <View className="h-[2px] overflow-hidden rounded-full bg-white/10">
                    <View
                      className="h-[2px] rounded-full bg-primary/60"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </View>
                </Pressable>

                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-xs text-neutral-300">
                    {formatDuration(Math.floor(safePosition))}
                  </Text>
                  <Text className="text-xs text-neutral-400">
                    -{formatDuration(Math.floor(remainingSeconds))}
                  </Text>
                </View>
              </View>
            </View>

            <View
              className="items-center mt-8"
              style={{ paddingBottom: insets.bottom + 4 }}
            >
              <TouchableOpacity
                onPress={() => {
                  void (isBrowsePlaying ? pauseBrowse() : play());
                }}
                className="items-center justify-center w-20 h-20 border rounded-full border-primary/30"
                accessibilityRole="button"
                accessibilityLabel={
                  isBrowsePlaying ? "Pause track" : "Play track"
                }
              >
                {isBrowseBuffering ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcons
                    name={isBrowsePlaying ? "pause" : "play-arrow"}
                    size={48}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
