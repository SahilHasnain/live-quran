import { colors } from "@/constants/theme";
import { type JuzEntry } from "@/data/quran-api";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  juzs: JuzEntry[];
  onSelect: (juz: JuzEntry) => void;
}

function toArabicNumeral(n: number): string {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n)
    .split("")
    .map((d) => digits[parseInt(d, 10)])
    .join("");
}

export default function QuranJuzPicker({
  visible,
  onClose,
  juzs,
  onSelect,
}: Props) {
  const sorted = [...juzs].sort((a, b) => a.juz_number - b.juz_number);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#080f0a]">
        <View className="flex-row items-center justify-between px-4 pb-3 pt-14">
          <TouchableOpacity
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <MaterialIcons name="close" size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">
            Select Para
          </Text>
          <View className="h-10 w-10" />
        </View>

        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.juz_number)}
          numColumns={3}
          contentContainerClassName="px-3 pb-8"
          columnWrapperClassName="gap-3"
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              activeOpacity={0.7}
              className="mb-3 flex-1 items-center rounded-2xl border border-white/10 bg-[#0a140e] px-2 py-5"
            >
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                <Text className="text-lg font-bold text-emerald-400">
                  {toArabicNumeral(item.juz_number)}
                </Text>
              </View>
              <Text className="text-base font-bold text-white">
                Para {item.juz_number}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500">
                {item.verses_count} verses
              </Text>
              <Text className="text-[10px] text-neutral-600">
                {Object.keys(item.verse_mapping).length} surahs
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}
