import bundledParas from "@/data/bundled-paras";
import type { BundledVerse } from "@/data/bundled-paras";
import bundledTranslationEN from "@/data/bundled-translation-en";
import bundledTranslationSI from "@/data/bundled-translation-si";
import bundledTranslationPS from "@/data/bundled-translation-ps";
import bundledTranslationSR from "@/data/bundled-translation-sr";
import type { TranslationData, TranslationEntry } from "@/data/bundled-translation-en";
import { getAllSurahs } from "@/data/quran";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
} from "react-native";

const TRANSLATION_PROGRESS_KEY = "@quran_translation_progress";
const TRANSLATION_LANG_KEY = "@quran_translation_lang";
const SCREEN_WIDTH = Dimensions.get("window").width;
const ALL_SURAHS = getAllSurahs();

type TranslationLang = "en" | "si" | "ps" | "sr";

const LANGUAGES: { key: TranslationLang; name: string; native: string }[] = [
  { key: "en", name: "English", native: "Kanz-ul-Iman" },
  { key: "si", name: "Sindhi", native: "Kanzul Irfan" },
  { key: "ps", name: "Pashto", native: "Kanz-ul-Irfan" },
  { key: "sr", name: "Saraiki", native: "Kanzul Irfan" },
];

const BUNDLED_TRANSLATIONS: Record<TranslationLang, Record<number, TranslationData>> = {
  en: bundledTranslationEN,
  si: bundledTranslationSI,
  ps: bundledTranslationPS,
  sr: bundledTranslationSR,
};

const VerseCard = memo(function VerseCard({
  verse,
  translation,
  lang,
}: {
  verse: BundledVerse;
  translation?: TranslationEntry;
  lang: TranslationLang;
}) {
  const verseNumber = verse.verse_number;
  const isRTL = lang !== "en";

  return (
    <View className="mb-6 rounded-2xl border border-white/10 bg-[#0a140e] p-4">
      {/* Verse number badge */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
          <Text className="text-xs font-bold text-emerald-400">
            {verseNumber}
          </Text>
        </View>
        <Text className="text-xs text-neutral-600">
          {verse.verse_key}
        </Text>
      </View>

      {/* Arabic text */}
      <Text
        className="mb-4 text-right text-xl leading-[40px] text-white"
        style={{ fontFamily: "KFGQPC_Uthmanic_Hafs_Regular" }}
      >
        {verse.text_uthmani}
      </Text>

      {/* Divider */}
      <View className="mb-4 h-px bg-white/10" />

      {/* Translation text */}
      {translation ? (
        <Text
          style={{
            fontSize: isRTL ? 20 : 18,
            lineHeight: isRTL ? 36 : 32,
            color: "#d4d4d4",
            textAlign: isRTL ? "right" : "left",
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        >
          {translation.text}
        </Text>
      ) : (
        <Text style={{ fontSize: 18, lineHeight: 32, color: "#525252", fontStyle: "italic" }}>
          Translation not available for this verse
        </Text>
      )}
    </View>
  );
});

function SurahTranslationPage({
  surahId,
  lang,
  onVerseChange,
}: {
  surahId: number;
  lang: TranslationLang;
  onVerseChange?: (verseIndex: number) => void;
}) {
  const translationData = BUNDLED_TRANSLATIONS[lang][surahId];
  const surah = ALL_SURAHS.find((s) => s.id === surahId);

  const allVerses = useMemo(() => {
    const verses: BundledVerse[] = [];
    for (let para = 1; para <= 30; para++) {
      for (const v of bundledParas[para] ?? []) {
        const [vSurah] = v.verse_key.split(":").map(Number);
        if (vSurah === surahId) verses.push(v);
      }
    }
    return verses;
  }, [surahId]);

  const translationMap = useMemo(() => {
    const map = new Map<number, TranslationEntry>();
    if (translationData) {
      for (const entry of translationData.entries) {
        map.set(entry.verse_number, entry);
      }
    }
    return map;
  }, [translationData]);

  const flatListRef = useRef<FlatList<BundledVerse>>(null);
  const onVerseChangeRef = useRef(onVerseChange);
  onVerseChangeRef.current = onVerseChange;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 30,
  });

  const viewabilityPairs = useRef([
    {
      viewabilityConfig: viewabilityConfig.current,
      onViewableItemsChanged: ({
        viewableItems,
      }: {
        viewableItems: ViewToken<BundledVerse>[];
      }) => {
        if (viewableItems.length > 0) {
          const idx = allVerses.findIndex(
            (v) => v.id === viewableItems[0].item.id,
          );
          onVerseChangeRef.current?.(idx);
        }
      },
    },
  ]);

  if (!surah || allVerses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <MaterialIcons name="error-outline" size={40} color="#525252" />
        <Text className="mt-3 text-sm text-neutral-500">
          Translation data not available
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      style={{ width: SCREEN_WIDTH }}
      contentContainerClassName="px-4 pb-32"
      showsVerticalScrollIndicator={false}
      data={allVerses}
      keyExtractor={(v) => String(v.id)}
      renderItem={({ item: v }) => {
        const verseNum = v.verse_number;
        return (
          <VerseCard
            verse={v}
            translation={translationMap.get(verseNum)}
            lang={lang}
          />
        );
      }}
      viewabilityConfigCallbackPairs={viewabilityPairs.current}
      removeClippedSubviews
      maxToRenderPerBatch={5}
      windowSize={5}
      initialNumToRender={8}
    />
  );
}

export default function TranslationReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const initialSurah = parseInt(id ?? "1", 10);

  const initialIndex = ALL_SURAHS.findIndex((s) => s.id === initialSurah);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0,
  );
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [lang, setLang] = useState<TranslationLang>("en");
  const [ready, setReady] = useState(false);

  const currentSurah = ALL_SURAHS[currentIndex];

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Load saved language
  useEffect(() => {
    AsyncStorage.getItem(TRANSLATION_LANG_KEY).then((saved) => {
      if (saved === "en" || saved === "si" || saved === "ps" || saved === "sr") {
        setLang(saved);
      }
    });
  }, []);

  // Save progress and language
  useEffect(() => {
    if (currentSurah) {
      AsyncStorage.setItem(TRANSLATION_PROGRESS_KEY, String(currentSurah.id));
    }
  }, [currentSurah]);

  useEffect(() => {
    AsyncStorage.setItem(TRANSLATION_LANG_KEY, lang);
  }, [lang]);

  const onMomentumEnd = useCallback(
    (e: any) => {
      const index = Math.round(
        e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      setCurrentIndex(index);
      setCurrentVerseIndex(0);
    },
    [],
  );

  const navigateToSurah = useCallback((surahId: number) => {
    setPickerVisible(false);
    const idx = ALL_SURAHS.findIndex((s) => s.id === surahId);
    if (idx >= 0) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      setCurrentIndex(idx);
      setCurrentVerseIndex(0);
    }
  }, []);

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      navigateToSurah(ALL_SURAHS[currentIndex - 1].id);
    }
  }, [currentIndex, navigateToSurah]);

  const navigateNext = useCallback(() => {
    if (currentIndex < ALL_SURAHS.length - 1) {
      navigateToSurah(ALL_SURAHS[currentIndex + 1].id);
    }
  }, [currentIndex, navigateToSurah]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [router]);

  const onVerseChange = useCallback((idx: number) => {
    setCurrentVerseIndex(idx);
  }, []);

  const currentLangInfo = LANGUAGES.find((l) => l.key === lang) ?? LANGUAGES[0];

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-[#080f0a]">
        <ActivityIndicator size="large" color="#34d399" />
        <Text className="mt-4 text-sm text-neutral-400">Loading Translation...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#080f0a]">
      {/* Header */}
      <View className="px-4 pb-2 pt-14">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <MaterialIcons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-white">
              {currentSurah?.transliteration ?? "Translation"}
            </Text>
            <Text className="text-xs text-neutral-400">
              {currentLangInfo.name} • {currentSurah?.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setLangPickerVisible(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15"
          >
            <MaterialIcons name="language" size={20} color="#34d399" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15"
          >
            <MaterialIcons name="swap-horiz" size={20} color="#34d399" />
          </TouchableOpacity>
        </View>

        {/* Surah navigation */}
        <View className="mt-3 flex-row items-center gap-2">
          <TouchableOpacity
            onPress={navigatePrev}
            disabled={currentIndex === 0}
            className={`h-9 flex-1 flex-row items-center justify-center gap-1 rounded-xl ${
              currentIndex === 0 ? "bg-white/5" : "bg-white/10"
            }`}
          >
            <MaterialIcons
              name="chevron-left"
              size={18}
              color={currentIndex === 0 ? "#525252" : "white"}
            />
            <Text
              className={`text-xs font-semibold ${
                currentIndex === 0 ? "text-neutral-600" : "text-white"
              }`}
            >
              Prev
            </Text>
          </TouchableOpacity>
          <View className="items-center rounded-xl bg-emerald-500/15 px-4 py-2">
            <Text className="text-xs font-bold text-emerald-400">
              {currentIndex + 1} / {ALL_SURAHS.length}
            </Text>
          </View>
          <TouchableOpacity
            onPress={navigateNext}
            disabled={currentIndex === ALL_SURAHS.length - 1}
            className={`h-9 flex-1 flex-row items-center justify-center gap-1 rounded-xl ${
              currentIndex === ALL_SURAHS.length - 1
                ? "bg-white/5"
                : "bg-white/10"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                currentIndex === ALL_SURAHS.length - 1
                  ? "text-neutral-600"
                  : "text-white"
              }`}
            >
              Next
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={18}
              color={
                currentIndex === ALL_SURAHS.length - 1 ? "#525252" : "white"
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Verse pager */}
      <FlatList
        ref={flatListRef}
        data={ALL_SURAHS}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <SurahTranslationPage
            surahId={item.id}
            lang={lang}
            onVerseChange={onVerseChange}
          />
        )}
      />

      {/* Language picker modal */}
      <Modal
        visible={langPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLangPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-[#080f0a] px-4 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-white">
                Select Language
              </Text>
              <TouchableOpacity
                onPress={() => setLangPickerVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
              >
                <MaterialIcons name="close" size={22} color="white" />
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {LANGUAGES.map((l) => (
                <TouchableOpacity
                  key={l.key}
                  onPress={() => {
                    setLang(l.key);
                    setLangPickerVisible(false);
                  }}
                  activeOpacity={0.7}
                  className={`flex-row items-center rounded-2xl border px-4 py-4 ${
                    l.key === lang
                      ? "border-emerald-400/40 bg-emerald-500/20"
                      : "border-white/10 bg-[#0a140e]"
                  }`}
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                    <MaterialIcons
                      name={l.key === lang ? "check-circle" : "language"}
                      size={20}
                      color={l.key === lang ? "#34d399" : "#525252"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-white">
                      {l.name}
                    </Text>
                    <Text className="text-xs text-neutral-500">{l.native}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Surah picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-3/4 rounded-t-3xl bg-[#080f0a]">
            <View className="flex-row items-center justify-between px-4 pb-3 pt-5">
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
              >
                <MaterialIcons name="close" size={22} color="white" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-white">
                Select Surah
              </Text>
              <View className="h-10 w-10" />
            </View>
            <FlatList
              data={ALL_SURAHS}
              keyExtractor={(item) => String(item.id)}
              contentContainerClassName="px-3 pb-6"
              className="flex-1"
              renderItem={({ item: s }) => (
                <TouchableOpacity
                  onPress={() => navigateToSurah(s.id)}
                  activeOpacity={0.7}
                  className={`mb-2 flex-row items-center rounded-2xl border px-4 py-3 ${
                    s.id === currentSurah?.id
                      ? "border-emerald-400/40 bg-emerald-500/20"
                      : "border-white/10 bg-[#0a140e]"
                  }`}
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                    <Text className="text-sm font-bold text-emerald-400">
                      {s.id}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-white">
                      {s.transliteration}
                    </Text>
                    <Text className="text-xs text-neutral-500">
                      {s.name} • {s.verses} verses
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
