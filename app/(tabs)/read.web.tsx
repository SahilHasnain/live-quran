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
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function ReadWebScreen() {
  const router = useRouter();
  const { currentTrack } = useTrackPlayer();
  const { lastPage, lastLang } = useQuranProgress();
  const { getBookmarks } = useQuranBookmarks();
  const [bookmarks, setBookmarks] = useState(getBookmarks(lastLang));
  const [languages, setLanguages] = useState<QuranLanguageEntry[]>([
    { key: "roman-urdu", label: "Roman Urdu", nativeLabel: "رومن اردو", pages: 1207 },
  ]);

  useEffect(() => {
    getLanguages().then(setLanguages);
  }, []);

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

        <TouchableOpacity
          onPress={() =>
            openReader(hasProgress ? lastPage : 1, lastLang)
          }
          activeOpacity={0.85}
          className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0a140e]"
        >
          <View className="p-8">
            <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
              <MaterialIcons
                name="auto-stories"
                size={32}
                color={colors.primary.light}
              />
            </View>
            <Text className="text-2xl font-bold text-white">Al-Quran</Text>
            <Text className="mt-2 text-base text-neutral-400">
              {currentLang.label} • Read in the name of your Lord
            </Text>

            {hasProgress && (
              <View className="mt-6 inline-flex flex-row items-center gap-3 rounded-2xl bg-emerald-500/10 px-5 py-4">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                  <MaterialIcons
                    name="play-arrow"
                    size={24}
                    color={colors.primary.light}
                  />
                </View>
                <View>
                  <Text className="text-base font-semibold text-white">
                    Continue Reading
                  </Text>
                  <Text className="text-sm text-neutral-400">
                    {surah.transliteration} • Page {lastPage}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={colors.text.muted}
                />
              </View>
            )}

            {!hasProgress && (
              <View className="mt-6 inline-flex flex-row items-center gap-3 rounded-2xl bg-emerald-500 px-5 py-4">
                <MaterialIcons name="play-arrow" size={24} color="#03140d" />
                <Text className="text-base font-bold text-[#03140d]">
                  Start Reading ({currentLang.label})
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View className="mt-10">
          <Text className="mb-5 text-xl font-bold text-white">Language</Text>
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
                      ? "border-emerald-400/30 bg-emerald-500/15"
                      : "border-white/10 bg-[#0a140e]"
                  }`}
                >
                  <MaterialIcons
                    name={isActive ? "check-circle" : "language"}
                    size={32}
                    color={
                      isActive ? colors.primary.light : colors.text.muted
                    }
                  />
                  <Text
                    className={`mt-3 text-lg font-semibold ${
                      isActive ? "text-white" : "text-neutral-300"
                    }`}
                  >
                    {lang.label}
                  </Text>
                  <Text className="mt-1 text-sm text-neutral-500">
                    {lang.nativeLabel}
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
                  className="flex-row items-center gap-2 rounded-full border border-white/10 bg-[#0a140e] px-5 py-3"
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
      </ScrollView>

      <MiniPlayer />
    </View>
  );
}
