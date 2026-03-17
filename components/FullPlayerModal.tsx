import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { formatDuration } from "@/services/appwrite";
import { MaterialIcons } from "@expo/vector-icons";
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

  const thumbnailSource = currentTrack.thumbnail
    ? { uri: currentTrack.thumbnail }
    : require("@/assets/images/icon.png");

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
      <View className="flex-1 bg-[#080f0a]" style={{ paddingTop: insets.top }}>
        <View className="absolute left-6 z-20" style={{ top: insets.top + 10 }}>
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
            <Image
              source={thumbnailSource}
              style={{
                width: "100%",
                maxWidth: 420,
                aspectRatio: 16 / 9,
                borderRadius: 14,
              }}
              contentFit="cover"
              transition={200}
            />

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
              className="items-center justify-center w-20 h-20 rounded-full border border-primary/30"
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
    </Modal>
  );
}
