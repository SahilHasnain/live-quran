import { colors } from "@/constants/theme";
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
    stopBrowse,
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
      <View className="flex-1 bg-[#080808]" style={{ paddingTop: insets.top }}>
        <View className="absolute top-20 right-[-80] h-72 w-72 rounded-full bg-primary/15" />
        <View className="absolute bottom-20 left-[-60] h-60 w-60 rounded-full bg-cyan-400/10" />

        <View className="px-5 pt-3 pb-2">
          <TouchableOpacity
            onPress={onClose}
            className="items-center justify-center w-10 h-10 rounded-full bg-white/10"
            accessibilityRole="button"
            accessibilityLabel="Close full player"
          >
            <MaterialIcons name="keyboard-arrow-down" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View className="justify-between flex-1 px-6 pb-8">
          <View className="items-center mt-8">
            <View className="rounded-3xl border border-neutral-700 bg-[#121212] p-2 shadow-2xl">
              <Image
                source={thumbnailSource}
                style={{ width: 300, height: 300, borderRadius: 20 }}
                contentFit="cover"
                transition={200}
              />
            </View>

            <View className="mt-8 w-full rounded-2xl border border-neutral-800 bg-[#111111]/95 px-4 py-4">
              <Text className="text-[11px] uppercase tracking-widest text-primary-light/90">
                Full Player
              </Text>
              <Text
                className="mt-2 text-2xl font-semibold text-white"
                numberOfLines={2}
              >
                {currentTrack.title}
              </Text>

              {currentTrack.uploader ? (
                <Text className="mt-2 text-sm text-neutral-300">
                  {currentTrack.uploader}
                </Text>
              ) : null}

              <View className="flex-row items-center mt-3">
                <MaterialIcons
                  name="schedule"
                  size={16}
                  color={colors.text.secondary}
                />
                <Text className="ml-1.5 text-sm text-neutral-400">
                  {formatDuration(currentTrack.duration)}
                </Text>
              </View>

              <View className="mt-5">
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
                  <View className="h-2 overflow-hidden rounded-full bg-neutral-700/80">
                    <View
                      className="h-2 rounded-full bg-primary"
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
          </View>

          <View
            className="flex-row items-center justify-center gap-6 mb-4"
            style={{ paddingBottom: insets.bottom + 4 }}
          >
            <TouchableOpacity
              onPress={() => {
                void stopBrowse();
                onClose();
              }}
              className="h-14 w-14 items-center justify-center rounded-full border border-neutral-700 bg-[#161616]"
              accessibilityRole="button"
              accessibilityLabel="Stop track"
            >
              <MaterialIcons name="stop" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void (isBrowsePlaying ? pauseBrowse() : play());
              }}
              className="items-center justify-center w-20 h-20 rounded-full bg-primary"
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
                  size={40}
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
