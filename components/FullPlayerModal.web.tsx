import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface FullPlayerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FullPlayerModal({ visible, onClose }: FullPlayerModalProps) {
  const { currentTrack, isBrowsePlaying, pauseBrowse, play } = useTrackPlayer();

  if (!currentTrack) {
    return null;
  }

  const thumbnailSource = currentTrack.thumbnail
    ? { uri: currentTrack.thumbnail }
    : require("@/assets/images/icon.png");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 px-8">
        <View className="w-full max-w-[960px] overflow-hidden rounded-[36px] border border-white/10 bg-[#09120d]">
          <View className="flex-row">
            <View className="flex-1 border-r border-white/10 p-8">
              <Text className="text-3xl font-bold text-white">
                {currentTrack.title}
              </Text>

              <View className="mt-8 flex-row items-center gap-4">
                <TouchableOpacity
                  onPress={() => {
                    void (isBrowsePlaying ? pauseBrowse() : play());
                  }}
                  className="h-14 w-14 items-center justify-center rounded-full bg-emerald-500"
                >
                  <MaterialIcons
                    name={isBrowsePlaying ? "pause" : "play-arrow"}
                    size={30}
                    color="white"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  className="rounded-full border border-white/10 px-5 py-3"
                >
                  <Text className="text-sm font-medium text-neutral-200">Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="w-[420px] bg-[#060d08] p-8">
              <Image
                source={thumbnailSource}
                style={{ width: "100%", height: 236, borderRadius: 28 }}
                contentFit="cover"
                transition={200}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
