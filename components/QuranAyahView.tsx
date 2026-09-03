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

export default React.memo(function QuranAyahView({
  verseNumber,
  textUthmani,
  isBismillah,
}: Props) {
  if (isBismillah) {
    return (
      <View className="items-center py-3">
        <Text
          style={{ fontFamily: "KFGQPC_Uthmanic_Hafs" }}
          className="text-3xl leading-[48px] text-white/80"
        >
          {textUthmani}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-start justify-end py-2">
      <View className="mr-2 mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-gold-500/15">
        <Text className="text-[10px] font-medium text-gold-400">
          {toArabicDigits(verseNumber)}
        </Text>
      </View>
      <Text
        style={{ fontFamily: "KFGQPC_Uthmanic_Hafs", lineHeight: 36 }}
        className="flex-1 text-right text-2xl leading-[36px] text-white"
      >
        {textUthmani}
      </Text>
    </View>
  );
});
