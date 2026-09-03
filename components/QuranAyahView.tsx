import React from "react";
import { Text, type LayoutChangeEvent } from "react-native";

interface Props {
  verseNumber: number;
  textUthmani: string;
  isBismillah?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
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
  onLayout,
}: Props) {
  if (isBismillah) {
    return (
      <Text
        onLayout={onLayout}
        style={{ fontFamily: "KFGQPC_Uthmanic_Hafs" }}
        className="text-center text-3xl leading-[52px] text-white/80"
      >
        {textUthmani}
        {"\n"}
      </Text>
    );
  }

  return (
    <Text
      onLayout={onLayout}
      style={{ fontFamily: "KFGQPC_Uthmanic_Hafs" }}
      className="text-right text-2xl leading-[38px] text-white"
    >
      {textUthmani}
      <Text style={{ fontSize: 15, lineHeight: 38, color: "#e0bd5e", marginHorizontal: 4 }}>
        ۝
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 38, color: "#e0bd5e" }}>
        {toArabicDigits(verseNumber)}
      </Text>
      {" "}
    </Text>
  );
});
