import { colors } from "@/constants/theme";
import React from "react";
import { Text, View } from "react-native";

interface Props {
  verseNumber: number;
  textUthmani: string;
  isBismillah?: boolean;
}

function toArabicDigits(n: number): string {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n)
    .split("")
    .map((d) => arabicDigits[parseInt(d)])
    .join("");
}

export default function QuranAyahView({
  verseNumber,
  textUthmani,
  isBismillah,
}: Props) {
  if (isBismillah) {
    return (
      <View className="items-center py-6">
        <Text
          style={{ fontFamily: "System" }}
          className="text-3xl leading-[60px] text-white/80"
        >
          {textUthmani}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-start justify-end px-4 py-4">
      <View className="mr-3 mt-1 h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
        <Text className="text-xs font-medium text-emerald-400">
          {toArabicDigits(verseNumber)}
        </Text>
      </View>
      <Text
        style={{ fontFamily: "System", lineHeight: 48 }}
        className="flex-1 text-right text-2xl leading-[48px] text-white"
      >
        {textUthmani}
      </Text>
    </View>
  );
}
