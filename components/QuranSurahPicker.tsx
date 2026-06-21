import { colors } from "@/constants/theme";
import { type ApiChapter } from "@/data/quran-api";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  chapters: ApiChapter[];
  onSelect: (chapter: ApiChapter) => void;
}

const SECTIONS = [
  { id: 1, name: "سُوَر", label: "Surahs" },
];

export default function QuranSurahPicker({
  visible,
  onClose,
  chapters,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return chapters;
    const q = search.toLowerCase();
    return chapters.filter(
      (c) =>
        c.name_simple.toLowerCase().includes(q) ||
        c.name_arabic.includes(q) ||
        String(c.id).includes(q),
    );
  }, [chapters, search]);

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
            Select Surah
          </Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mx-4 mb-3 rounded-xl bg-[#0f1a12] px-4 py-2">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search surah..."
            placeholderTextColor={colors.text.muted}
            className="text-base text-white"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
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
              className="mb-3 flex-1 items-center rounded-2xl border border-white/10 bg-[#0a140e] px-2 py-4"
            >
              <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                <Text className="text-xs font-bold text-emerald-400">
                  {item.id}
                </Text>
              </View>
              <Text className="text-center text-lg font-medium text-white">
                {item.name_arabic}
              </Text>
              <Text className="mt-0.5 text-center text-[11px] text-neutral-500">
                {item.name_simple}
              </Text>
              <Text className="mt-0.5 text-[10px] text-neutral-600">
                {item.verses_count} verses
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <MaterialIcons
                name="search-off"
                size={40}
                color={colors.text.muted}
              />
              <Text className="mt-3 text-sm text-neutral-500">
                No surahs found
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}
