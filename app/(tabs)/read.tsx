import { MiniPlayer } from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import {
  getSurahForPage,
  getAllSurahs,
  type QuranLang,
} from "@/data/quran";
import {
  getLanguages,
  type QuranLanguageEntry,
} from "@/lib/quran-manifest";
import { useQuranBookmarks } from "@/hooks/useQuranBookmarks";
import { useQuranProgress } from "@/hooks/useQuranProgress";
import { useQuranArabic } from "@/hooks/useQuranArabic";
import { useQuranArabicProgress } from "@/hooks/useQuranArabicProgress";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

const TAFSIR_PROGRESS_KEY = "@quran_tafseer_progress";

type ReadTab = "arabic" | "translations" | "tafsir";
const ACTIVE_TAB_KEY = "@read_active_tab";

function toArabicNumeral(n: number): string {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n)
    .split("")
    .map((d) => digits[parseInt(d, 10)])
    .join("");
}

function SegmentedControl({
  activeTab,
  onTabChange,
}: {
  activeTab: ReadTab;
  onTabChange: (tab: ReadTab) => void;
}) {
  return (
    <View className="mb-6 flex-row rounded-xl bg-[#0a140e] p-1">
      {([
        { key: "arabic", icon: "menu-book", label: "Tilawat" },
        { key: "translations", icon: "auto-stories", label: "Translations" },
        { key: "tafsir", icon: "import-contacts", label: "Tafsir" },
      ] as const).map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.7}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] py-2.5 ${
            activeTab === tab.key ? "bg-emerald-500" : ""
          }`}
        >
          <MaterialIcons
            name={tab.icon}
            size={16}
            color={activeTab === tab.key ? "#03140d" : colors.text.muted}
          />
          <Text
            className={`text-xs font-semibold ${
              activeTab === tab.key ? "text-[#03140d]" : "text-neutral-400"
            }`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const TRANSLATION_PROGRESS_KEY = "@quran_translation_progress";
const TRANSLATION_LANG_KEY = "@quran_translation_lang";

type TranslationLang = "en" | "si" | "ps" | "sr" | "ur";

const TRANSLATION_LANGS: { key: TranslationLang; name: string; native: string }[] = [
  { key: "ur", name: "Roman Urdu", native: "Kanzul Iman" },
  { key: "en", name: "English", native: "Kanz-ul-Iman" },
  { key: "si", name: "Sindhi", native: "Kanzul Irfan" },
  { key: "ps", name: "Pashto", native: "Kanz-ul-Irfan" },
  { key: "sr", name: "Saraiki", native: "Kanzul Irfan" },
];

function TranslationsTab() {
  const router = useRouter();
  const [lastSurah, setLastSurah] = useState<number | null>(null);
  const [selectedLang, setSelectedLang] = useState<TranslationLang>("en");
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const { lastPage, lastLang } = useQuranProgress();
  const hasProgress = lastPage > 1;

  useEffect(() => {
    AsyncStorage.getItem(TRANSLATION_PROGRESS_KEY).then((val) => {
      if (val) setLastSurah(parseInt(val, 10));
    });
    AsyncStorage.getItem(TRANSLATION_LANG_KEY).then((val) => {
      if (val === "en" || val === "si" || val === "ps" || val === "sr" || val === "ur") {
        setSelectedLang(val);
      }
    });
  }, []);

  const allSurahs = getAllSurahs();
  const currentLangInfo = TRANSLATION_LANGS.find((l) => l.key === selectedLang) ?? TRANSLATION_LANGS[0];

  return (
    <View>
      {/* Language dropdown */}
      <View className="mb-4">
        <Text className="mb-3 text-sm font-semibold text-neutral-400">
          Translation Language
        </Text>
        <TouchableOpacity
          onPress={() => setLangPickerVisible(true)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between rounded-xl border border-white/10 bg-[#0a140e] px-4 py-3"
        >
          <View className="flex-row items-center gap-3">
            <MaterialIcons name="language" size={20} color="#34d399" />
            <Text className="text-sm font-semibold text-white">
              {currentLangInfo.name}
            </Text>
            <Text className="text-xs text-neutral-500">
              ({currentLangInfo.native})
            </Text>
          </View>
          <MaterialIcons name="arrow-drop-down" size={22} color="#525252" />
        </TouchableOpacity>
      </View>

      {selectedLang === "ur" ? (
        /* Roman Urdu — image-based Kanzul Iman reader */
        <TouchableOpacity
          onPress={() => {
            const page = hasProgress ? lastPage : 1;
            router.push(`/reader/roman-urdu/${page}` as never);
          }}
          activeOpacity={0.85}
          className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0a140e]"
        >
          <View className="p-6">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
                <MaterialIcons
                  name="auto-stories"
                  size={28}
                  color={colors.primary.light}
                />
              </View>
              <Text className="flex-1 text-xl font-bold text-white">
                Kanzul Iman
              </Text>
            </View>

            {hasProgress ? (
              <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                  <MaterialIcons
                    name="play-arrow"
                    size={22}
                    color={colors.primary.light}
                  />
                </View>
                <Text className="flex-1 text-sm font-semibold text-white">
                  Continue Reading
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={colors.text.muted}
                />
              </View>
            ) : (
              <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-emerald-500 px-4 py-3">
                <MaterialIcons name="play-arrow" size={22} color="#03140d" />
                <Text className="text-sm font-bold text-[#03140d]">
                  Start Reading
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ) : (
        /* Verse-by-verse translations */
        <>
          {lastSurah != null && (
            <TouchableOpacity
              onPress={() => router.push(`/reader/translation/${lastSurah}` as never)}
              activeOpacity={0.85}
              className="mb-4 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/10"
            >
              <View className="flex-row items-center gap-3 px-4 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                  <MaterialIcons name="play-arrow" size={22} color="#34d399" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">
                    Continue Translation
                  </Text>
                  <Text className="text-xs text-neutral-400">
                    {allSurahs.find((s) => s.id === lastSurah)?.transliteration ?? `Surah ${lastSurah}`} • {currentLangInfo.name}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#a3a3a3" />
              </View>
            </TouchableOpacity>
          )}

          <Text className="mb-3 text-sm font-semibold text-neutral-400">
            Surah List
          </Text>
          <View style={{ gap: 8 }}>
            {allSurahs.map((surah) => (
              <TouchableOpacity
                key={surah.id}
                onPress={() => router.push(`/reader/translation/${surah.id}` as never)}
                activeOpacity={0.7}
                className="flex-row items-center rounded-2xl border border-white/10 bg-[#0a140e] px-4 py-3"
              >
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                  <Text className="text-sm font-bold text-emerald-400">
                    {surah.id}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">
                    {surah.transliteration}
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    {surah.name} • {surah.verses} verses
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#525252" />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

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
              {TRANSLATION_LANGS.map((l) => (
                <TouchableOpacity
                  key={l.key}
                  onPress={() => {
                    setSelectedLang(l.key);
                    setLangPickerVisible(false);
                  }}
                  activeOpacity={0.7}
                  className={`flex-row items-center rounded-2xl border px-4 py-4 ${
                    l.key === selectedLang
                      ? "border-emerald-400/40 bg-emerald-500/20"
                      : "border-white/10 bg-[#0a140e]"
                  }`}
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                    <MaterialIcons
                      name={l.key === selectedLang ? "check-circle" : "language"}
                      size={20}
                      color={l.key === selectedLang ? "#34d399" : "#525252"}
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
    </View>
  );
}

function TafsirTab() {
  const router = useRouter();
  const [lastSurah, setLastSurah] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(TAFSIR_PROGRESS_KEY).then((val) => {
      if (val) setLastSurah(parseInt(val, 10));
    });
  }, []);

  const allSurahs = getAllSurahs();

  return (
    <View>
      {lastSurah != null && (
        <TouchableOpacity
          onPress={() => router.push(`/reader/tafsir/${lastSurah}` as never)}
          activeOpacity={0.85}
          className="mb-4 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/10"
        >
          <View className="flex-row items-center gap-3 px-4 py-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <MaterialIcons name="play-arrow" size={22} color="#34d399" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">
                Continue Tafsir
              </Text>
              <Text className="text-xs text-neutral-400">
                {allSurahs.find((s) => s.id === lastSurah)?.transliteration ?? `Surah ${lastSurah}`}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#a3a3a3" />
          </View>
        </TouchableOpacity>
      )}

      <Text className="mb-3 text-sm font-semibold text-neutral-400">
        Surah List
      </Text>
      <View style={{ gap: 8 }}>
        {allSurahs.map((surah) => (
          <TouchableOpacity
            key={surah.id}
            onPress={() => router.push(`/reader/tafsir/${surah.id}` as never)}
            activeOpacity={0.7}
            className="flex-row items-center rounded-2xl border border-white/10 bg-[#0a140e] px-4 py-3"
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
              <Text className="text-sm font-bold text-emerald-400">
                {surah.id}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">
                {surah.transliteration}
              </Text>
              <Text className="text-xs text-neutral-500">
                {surah.name} • {surah.verses} verses
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#525252" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ReadScreen() {
  const router = useRouter();
  const { currentTrack } = useTrackPlayer();
  const {
    handleScroll: handleHeaderScroll,
    translateY: headerTranslateY,
    showHeader,
  } = useHeaderVisibility();
  const { handleScroll: handleTabBarScroll } = useTabBarVisibility();
  const { lastPage, lastLang } = useQuranProgress();
  const { getBookmarks } = useQuranBookmarks();
  const [bookmarks, setBookmarks] = useState(getBookmarks(lastLang));
  const [languages, setLanguages] = useState<QuranLanguageEntry[]>([
    { key: "roman-urdu", label: "Roman Urdu", nativeLabel: "رومن اردو", pages: 1207 },
  ]);
  const [activeTab, setActiveTab] = useState<ReadTab>("arabic");
  const { juzs, loading, error } = useQuranArabic();
  const { lastPara, lastVerseId } = useQuranArabicProgress();

  useEffect(() => {
    getLanguages().then(setLanguages);

    AsyncStorage.getItem(ACTIVE_TAB_KEY).then((saved) => {
      if (saved === "arabic" || saved === "translations" || saved === "tafsir") {
        setActiveTab(saved);
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      showHeader();
      setBookmarks(getBookmarks(lastLang));
    }, [showHeader, getBookmarks, lastLang]),
  );

  const handleScroll = (event: any) => {
    handleHeaderScroll(event);
    handleTabBarScroll(event);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const miniPlayerPadding = currentTrack ? 132 : 32;
  const surah = getSurahForPage(lastPage);
  const hasProgress = lastPage > 1;

  const openReader = (page: number, lang: QuranLang) => {
    router.push(`/reader/${lang}/${page}` as never);
  };

  const currentLang =
    languages.find((l) => l.key === lastLang) ?? languages[0];

  return (
    <View className="flex-1 bg-[#080f0a]">
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[headerAnimatedStyle]}
        className="absolute top-0 left-0 right-0 z-50 bg-[#080f0a]"
      >
        <View className="px-4 pb-3 pt-14">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <MaterialIcons name="auto-stories" size={22} color="#34d399" />
            </View>
            <Text className="text-lg font-semibold text-white">Read</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 110,
          paddingBottom: miniPlayerPadding,
        }}
      >
        <View className="px-4">
          <SegmentedControl
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <View style={{ display: activeTab === "arabic" ? "flex" : "none" }}>
            {lastPara != null && (
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    lastVerseId
                      ? `/reader/arabic/${lastPara}?verse=${lastVerseId}`
                      : `/reader/arabic/${lastPara}`,
                  )
                }
                activeOpacity={0.85}
                className="mb-4 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/10"
              >
                <View className="flex-row items-center gap-3 px-4 py-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                    <MaterialIcons name="play-arrow" size={22} color="#34d399" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Continue Reading
                    </Text>
                    <Text className="text-xs text-neutral-400">
                      Para {lastPara}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#a3a3a3" />
                </View>
              </TouchableOpacity>
            )}

            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {[...juzs]
                .sort((a, b) => a.juz_number - b.juz_number)
                .map((juz) => (
                  <TouchableOpacity
                    key={juz.juz_number}
                    onPress={() =>
                      router.push(`/reader/arabic/${juz.juz_number}`)
                    }
                    activeOpacity={0.7}
                    className="items-center rounded-2xl border border-white/10 bg-[#0a140e] px-1 py-4"
                    style={{ width: "31%" }}
                  >
                    <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                      <Text className="text-base font-bold text-emerald-400">
                        {toArabicNumeral(juz.juz_number)}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-white">
                      Para {juz.juz_number}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-neutral-500">
                      {juz.verses_count} aayah
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          <View style={{ display: activeTab === "translations" ? "flex" : "none" }}>
            <TranslationsTab />
          </View>

          <View style={{ display: activeTab === "tafsir" ? "flex" : "none" }}>
            <TafsirTab />
          </View>
        </View>
      </Animated.ScrollView>

      <MiniPlayer />
    </View>
  );
}
