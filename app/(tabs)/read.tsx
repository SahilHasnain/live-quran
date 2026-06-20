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
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

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

  useEffect(() => {
    getLanguages().then(setLanguages);
  }, []);

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
          <TouchableOpacity
            onPress={() =>
              openReader(hasProgress ? lastPage : 1, lastLang)
            }
            activeOpacity={0.85}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0a140e]"
          >
            <View className="p-6">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
                <MaterialIcons
                  name="auto-stories"
                  size={28}
                  color={colors.primary.light}
                />
              </View>
              <Text className="text-xl font-bold text-white">Al-Quran</Text>
              <Text className="mt-1 text-sm text-neutral-400">
                {currentLang.label} • Read in the name of your Lord
              </Text>

              {hasProgress && (
                <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                    <MaterialIcons
                      name="play-arrow"
                      size={22}
                      color={colors.primary.light}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Continue Reading
                    </Text>
                    <Text className="text-xs text-neutral-400">
                      {surah.transliteration} • Page {lastPage}
                    </Text>
                  </View>
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
                    <Text className="mt-0.5 text-xs text-neutral-500">
                      {lang.nativeLabel}
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
        </View>
      </Animated.ScrollView>

      <MiniPlayer />
    </View>
  );
}
