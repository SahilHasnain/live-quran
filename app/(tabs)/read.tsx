import { MiniPlayer } from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
import { useHeaderVisibility } from "@/contexts/HeaderVisibilityContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTrackPlayer } from "@/contexts/TrackPlayerContext";
import {
  getSurahForPage,
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
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

type ReadTab = "arabic" | "translations";
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
      <TouchableOpacity
        onPress={() => onTabChange("arabic")}
        activeOpacity={0.7}
        className={`flex-1 flex-row items-center justify-center gap-2 rounded-[10px] py-2.5 ${
          activeTab === "arabic" ? "bg-emerald-500" : ""
        }`}
      >
        <MaterialIcons
          name="menu-book"
          size={18}
          color={activeTab === "arabic" ? "#03140d" : colors.text.muted}
        />
        <Text
          className={`text-sm font-semibold ${
            activeTab === "arabic"
              ? "text-[#03140d]"
              : "text-neutral-400"
          }`}
        >
          Arabic
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onTabChange("translations")}
        activeOpacity={0.7}
        className={`flex-1 flex-row items-center justify-center gap-2 rounded-[10px] py-2.5 ${
          activeTab === "translations" ? "bg-emerald-500" : ""
        }`}
      >
        <MaterialIcons
          name="auto-stories"
          size={18}
          color={activeTab === "translations" ? "#03140d" : colors.text.muted}
        />
        <Text
          className={`text-sm font-semibold ${
            activeTab === "translations"
              ? "text-[#03140d]"
              : "text-neutral-400"
          }`}
        >
          Translations
        </Text>
      </TouchableOpacity>
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
      if (saved === "arabic" || saved === "translations") {
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

          {activeTab === "arabic" && (
            <View>
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

              {loading ? (
                <View className="items-center py-32">
                  <ActivityIndicator size="large" color={colors.primary.light} />
                  <Text className="mt-4 text-sm text-neutral-400">
                    Loading...
                  </Text>
                </View>
              ) : error ? (
                <View className="items-center py-32">
                  <MaterialIcons
                    name="error-outline"
                    size={40}
                    color={colors.text.muted}
                  />
                  <Text className="mt-3 text-sm text-neutral-500">
                    {error}
                  </Text>
                </View>
              ) : (
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
              )}
            </View>
          )}

          {activeTab === "translations" && (
            <>
              <TouchableOpacity
                onPress={() =>
                  openReader(hasProgress ? lastPage : 1, lastLang)
                }
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

                  {hasProgress && (
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
                  )}

                  {!hasProgress && (
                    <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-emerald-500 px-4 py-3">
                      <MaterialIcons name="play-arrow" size={22} color="#03140d" />
                      <Text className="text-sm font-bold text-[#03140d]">
                        Start Reading ({currentLang.label})
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View className="mt-8">
                <Text className="mb-4 text-lg font-semibold text-white">
                  Language
                </Text>
                <View className="flex-row gap-3">
                  {languages.map((lang) => {
                    const isActive = lang.key === lastLang;
                    return (
                      <TouchableOpacity
                        key={lang.key}
                        onPress={() => openReader(1, lang.key)}
                        activeOpacity={0.7}
                        className={`flex-1 flex-col items-center rounded-2xl border px-4 py-4 ${
                          isActive
                            ? "border-emerald-400/30 bg-emerald-500/15"
                            : "border-white/10 bg-[#0a140e]"
                        }`}
                      >
                        <MaterialIcons
                          name={isActive ? "check-circle" : "language"}
                          size={24}
                          color={
                            isActive
                              ? colors.primary.light
                              : colors.text.muted
                          }
                        />
                        <Text
                          className={`mt-2 text-sm font-semibold ${
                            isActive ? "text-white" : "text-neutral-300"
                          }`}
                        >
                          {lang.label}
                        </Text>

                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {bookmarks.length > 0 && (
                <View className="mt-8">
                  <Text className="mb-4 text-lg font-semibold text-white">
                    Bookmarks
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {bookmarks.map((bm) => (
                      <TouchableOpacity
                        key={bm.id}
                        onPress={() => openReader(bm.page, bm.lang)}
                        activeOpacity={0.7}
                        className="flex-row items-center gap-2 rounded-full border border-white/10 bg-[#0a140e] px-4 py-2.5"
                      >
                        <MaterialIcons
                          name="bookmark"
                          size={16}
                          color={colors.primary.light}
                        />
                        <Text className="text-sm text-white">
                          {bm.label} • p.{bm.page}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>

      <MiniPlayer />
    </View>
  );
}
