import QuranAyahView from "@/components/QuranAyahView";
import { colors } from "@/constants/theme";
import {
  type ApiVerseWithNumber,
  type JuzEntry,
  fetchJuzs,
  fetchVerses,
  getCachedJuzs,
} from "@/data/quran-api";
import { useQuranArabicProgress } from "@/hooks/useQuranArabicProgress";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

function parseVerseRange(
  range: string,
): { start: number; end: number } | null {
  const parts = range.split("-");
  if (parts.length !== 2) return null;
  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);
  if (isNaN(start) || isNaN(end)) return null;
  return { start, end };
}

const JUZ_CACHE_PREFIX = "@juz_verses_";
const juzVersesCache: Record<number, ApiVerseWithNumber[]> = {};

async function saveJuzToDisk(
  juzNumber: number,
  verses: ApiVerseWithNumber[],
) {
  await AsyncStorage.setItem(
    JUZ_CACHE_PREFIX + juzNumber,
    JSON.stringify(verses),
  );
}

async function loadJuzFromDisk(
  juzNumber: number,
): Promise<ApiVerseWithNumber[] | null> {
  const raw = await AsyncStorage.getItem(JUZ_CACHE_PREFIX + juzNumber);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiVerseWithNumber[];
  } catch {
    return null;
  }
}

async function loadVersesForJuz(
  juzNumber: number,
  onChunk?: (verses: ApiVerseWithNumber[]) => void,
): Promise<ApiVerseWithNumber[]> {
  const cached = juzVersesCache[juzNumber];
  if (cached) return cached;

  const diskVerses = await loadJuzFromDisk(juzNumber);
  if (diskVerses) {
    juzVersesCache[juzNumber] = diskVerses;
    onChunk?.(diskVerses);
    return diskVerses;
  }

  const allJuzs = await fetchJuzs();
  const found = allJuzs.find((j) => j.juz_number === juzNumber);
  if (!found) return [];

  const entries = Object.entries(found.verse_mapping);
  const all: ApiVerseWithNumber[] = [];

  await Promise.all(
    entries.map(async ([chId, rangeStr]) => {
      const chapterId = parseInt(chId, 10);
      const range = parseVerseRange(rangeStr);
      if (!range) return;
      const chapterVerses = await fetchVerses(chapterId);
      const filtered = chapterVerses.filter(
        (v) =>
          v.verse_number >= range.start && v.verse_number <= range.end,
      );
      all.push(...filtered);
      onChunk?.(filtered);
    }),
  );

  juzVersesCache[juzNumber] = all;
  saveJuzToDisk(juzNumber, all);
  return all;
}

function ParaPage({
  juzNumber,
  onLoaded,
}: {
  juzNumber: number;
  onLoaded?: (juz: number) => void;
}) {
  const [verses, setVerses] = useState<ApiVerseWithNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const notified = useRef(false);

  useEffect(() => {
    let cancelled = false;
    notified.current = false;
    setVerses([]);
    setLoading(true);
    loadVersesForJuz(juzNumber, (chunk) => {
      if (!cancelled) {
        setVerses((prev) => [...prev, ...chunk]);
      }
    }).then((all) => {
      if (!cancelled) {
        setVerses(all);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [juzNumber]);

  useEffect(() => {
    if (!loading && verses.length > 0 && !notified.current) {
      notified.current = true;
      onLoaded?.(juzNumber);
    }
  }, [loading, verses.length, juzNumber, onLoaded]);

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ width: SCREEN_WIDTH }}
      >
        <ActivityIndicator size="large" color={colors.primary.light} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ width: SCREEN_WIDTH }}
      contentContainerClassName="px-4 pb-32"
      showsVerticalScrollIndicator={false}
    >
      {verses.map((v) => (
        <QuranAyahView
          key={v.id}
          verseNumber={v.verse_number}
          textUthmani={v.text_uthmani}
        />
      ))}
    </ScrollView>
  );
}

export default function ArabicParaReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const initialJuz = parseInt(id ?? "1", 10);
  const { saveLastPara } = useQuranArabicProgress();

  const [sortedJuzs, setSortedJuzs] = useState<JuzEntry[]>(() => {
    const cached = getCachedJuzs();
    return cached
      ? [...cached].sort((a, b) => a.juz_number - b.juz_number)
      : [];
  });

  const initialIndex = sortedJuzs.findIndex(
    (j) => j.juz_number === initialJuz,
  );

  const flatListRef = useRef<FlatList<JuzEntry>>(null);
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0,
  );

  useEffect(() => {
    if (sortedJuzs.length === 0) {
      fetchJuzs().then((all) => {
        const sorted = [...all].sort((a, b) => a.juz_number - b.juz_number);
        setSortedJuzs(sorted);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sortedJuzs.length > 0) {
      const idx = sortedJuzs.findIndex((j) => j.juz_number === initialJuz);
      if (idx >= 0 && idx !== currentIndex) {
        setCurrentIndex(idx);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        }, 100);
      }
    }
  }, [sortedJuzs]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentJuz = sortedJuzs[currentIndex] ?? null;

  const [pickerVisible, setPickerVisible] = useState(false);

  const onMomentumEnd = useCallback(
    (e: any) => {
      const index = Math.round(
        e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      setCurrentIndex(index);
      const juz = sortedJuzs[index];
      if (juz) saveLastPara(juz.juz_number);
    },
    [sortedJuzs, saveLastPara],
  );

  const navigateToJuz = useCallback(
    (n: number) => {
      setPickerVisible(false);
      const idx = sortedJuzs.findIndex((j) => j.juz_number === n);
      if (idx >= 0) {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        setCurrentIndex(idx);
        saveLastPara(n);
      }
    },
    [sortedJuzs, saveLastPara],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [router]);

  return (
    <View className="flex-1 bg-[#080f0a]">
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
              {currentJuz
                ? `Para ${currentJuz.juz_number}`
                : "Loading..."}
            </Text>
            {currentJuz && (
              <Text className="text-xs text-neutral-500">
                {currentJuz.verses_count} verses
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15"
          >
            <MaterialIcons name="list" size={20} color="#34d399" />
          </TouchableOpacity>
        </View>
      </View>

      {sortedJuzs.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.light} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={sortedJuzs}
          keyExtractor={(item) => String(item.juz_number)}
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
            <ParaPage
              juzNumber={item.juz_number}
              onLoaded={(juz) => {
                if (juz < 30) loadVersesForJuz(juz + 1);
              }}
            />
          )}
        />
      )}

      {/* Para picker bottom sheet */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-1/2 rounded-t-3xl bg-[#080f0a]">
            <View className="flex-row items-center justify-between px-4 pb-3 pt-5">
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
              >
                <MaterialIcons name="close" size={22} color="white" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-white">
                Select Para
              </Text>
              <View className="h-10 w-10" />
            </View>
            <FlatList
              data={sortedJuzs}
              keyExtractor={(item) => String(item.juz_number)}
              numColumns={3}
              columnWrapperClassName="gap-3"
              contentContainerClassName="px-3 pb-6"
              className="flex-1"
              renderItem={({ item: j }) => (
                <TouchableOpacity
                  onPress={() => navigateToJuz(j.juz_number)}
                  activeOpacity={0.7}
                  className={`mb-3 flex-1 items-center rounded-2xl border px-2 py-5 ${
                    j.juz_number === currentJuz?.juz_number
                      ? "border-emerald-400/40 bg-emerald-500/20"
                      : "border-white/10 bg-[#0a140e]"
                  }`}
                >
                  <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                    <Text className="text-lg font-bold text-emerald-400">
                      {toArabicNumeral(j.juz_number)}
                    </Text>
                  </View>
                  <Text className="text-base font-bold text-white">
                    Para {j.juz_number}
                  </Text>
                  <Text className="mt-1 text-xs text-neutral-500">
                    {j.verses_count} verses
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function toArabicNumeral(n: number): string {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n)
    .split("")
    .map((d) => digits[parseInt(d, 10)])
    .join("");
}
