import { MiniPlayer } from "@/components/MiniPlayer";
import { colors } from "@/constants/theme";
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
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
    <View className="mb-8 flex-row rounded-xl bg-[#101729] p-1">
      <TouchableOpacity
        onPress={() => onTabChange("arabic")}
        activeOpacity={0.7}
        className={`flex-1 flex-row items-center justify-center gap-2 rounded-[10px] py-3 ${
          activeTab === "arabic" ? "bg-gold-500" : ""
        }`}
      >
        <MaterialIcons
          name="menu-book"
          size={20}
          color={activeTab === "arabic" ? "#1a1204" : colors.text.muted}
        />
        <Text
          className={`text-base font-semibold ${
            activeTab === "arabic"
              ? "text-[#1a1204]"
              : "text-neutral-400"
          }`}
        >
          Arabic
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onTabChange("translations")}
        activeOpacity={0.7}
        className={`flex-1 flex-row items-center justify-center gap-2 rounded-[10px] py-3 ${
          activeTab === "translations" ? "bg-gold-500" : ""
        }`}
      >
        <MaterialIcons
          name="auto-stories"
          size={20}
          color={activeTab === "translations" ? "#1a1204" : colors.text.muted}
        />
        <Text
          className={`text-base font-semibold ${
            activeTab === "translations"
              ? "text-[#1a1204]"
              : "text-neutral-400"
          }`}
        >
          Translations
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ReadWebScreen() {
  const router = useRouter();
  const { currentTrack } = useTrackPlayer();
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
      setBookmarks(getBookmarks(lastLang));
    }, [getBookmarks, lastLang]),
  );

  const surah = getSurahForPage(lastPage);
  const hasProgress = lastPage > 1;

  const openReader = (page: number, lang: QuranLang) => {
    router.push(`/reader/${lang}/${page}` as never);
  };

  const currentLang =
    languages.find((l) => l.key === lastLang) ?? languages[0];

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 40,
          paddingBottom: currentTrack ? 140 : 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8">
          <Text className="text-4xl font-bold leading-[48px] text-white">
            Read
          </Text>
        </View>

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
                className="mb-6 overflow-hidden rounded-[28px] border border-gold-400/20 bg-gold-500/10"
              >
                <View className="flex-row items-center gap-4 px-6 py-5">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15">
                    <MaterialIcons name="play-arrow" size={24} color="#e0bd5e" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-white">
                      Continue Reading
                    </Text>
                    <Text className="text-sm text-neutral-400">
                      Para {lastPara}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#a3a3a3" />
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
                      className="items-center rounded-2xl border border-white/10 bg-[#101729] px-1 py-4"
                      style={{ width: "31%" }}
                    >
                      <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-gold-500/15">
                        <Text className="text-base font-bold text-gold-400">
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
              className="overflow-hidden rounded-[28px] border border-white/10 bg-[#101729]"
            >
              <View className="p-8">
                  <View className="flex-row items-center gap-4">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/15">
                      <MaterialIcons
                        name="auto-stories"
                        size={32}
                        color={colors.primary.light}
                      />
                    </View>
                    <Text className="flex-1 text-2xl font-bold text-white">
                      Kanzul Iman
                    </Text>
                  </View>

                  {hasProgress && (
                  <View className="mt-6 inline-flex flex-row items-center gap-3 rounded-2xl bg-gold-500/10 px-5 py-4">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold-500/15">
                      <MaterialIcons
                        name="play-arrow"
                        size={24}
                        color={colors.primary.light}
                      />
                    </View>
                    <Text className="flex-1 text-base font-semibold text-white">
                      Continue Reading
                    </Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color={colors.text.muted}
                    />
                  </View>
                )}

                {!hasProgress && (
                  <View className="mt-6 inline-flex flex-row items-center gap-3 rounded-2xl bg-gold-500 px-5 py-4">
                    <MaterialIcons name="play-arrow" size={24} color="#1a1204" />
                    <Text className="text-base font-bold text-[#1a1204]">
                      Start Reading ({currentLang.label})
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View className="mt-10">
              <Text className="mb-5 text-xl font-bold text-white">
                Language
              </Text>
              <View className="flex-row gap-4">
                {languages.map((lang) => {
                  const isActive = lang.key === lastLang;
                  return (
                    <TouchableOpacity
                      key={lang.key}
                      onPress={() => openReader(1, lang.key)}
                      activeOpacity={0.7}
                      className={`flex-1 flex-col items-center rounded-[28px] border px-6 py-6 ${
                        isActive
                          ? "border-gold-400/30 bg-gold-500/15"
                          : "border-white/10 bg-[#101729]"
                      }`}
                    >
                      <MaterialIcons
                        name={isActive ? "check-circle" : "language"}
                        size={32}
                        color={
                          isActive
                            ? colors.primary.light
                            : colors.text.muted
                        }
                      />
                      <Text
                        className={`mt-3 text-lg font-semibold ${
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
              <View className="mt-10">
                <Text className="mb-5 text-xl font-bold text-white">
                  Bookmarks
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {bookmarks.map((bm) => (
                    <TouchableOpacity
                      key={bm.id}
                      onPress={() => openReader(bm.page, bm.lang)}
                      activeOpacity={0.7}
                      className="flex-row items-center gap-2 rounded-full border border-white/10 bg-[#101729] px-5 py-3"
                    >
                      <MaterialIcons
                        name="bookmark"
                        size={18}
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
      </ScrollView>

      <MiniPlayer />
    </View>
  );
}
