import QuranAyahView from "@/components/QuranAyahView";
import { getVersesByJuz, type DbVerse } from "@/lib/quran-db";
import type { SQLiteDatabase } from "expo-sqlite";
import { useSQLiteContext } from "expo-sqlite";
import juzsList from "@/data/juzs.json";
import { useQuranArabicProgress } from "@/hooks/useQuranArabicProgress";
import { MaterialIcons } from "@expo/vector-icons";
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
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

interface JuzMeta {
  juz_number: number;
  verses_count: number;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const sortedJuzs = (juzsList as JuzMeta[]).sort(
  (a, b) => a.juz_number - b.juz_number,
);

const versesByJuzCache = new Map<number, DbVerse[]>();

function useVersesForJuz(db: SQLiteDatabase, juzNumber: number) {
  const [verses, setVerses] = useState<DbVerse[] | null>(
    () => versesByJuzCache.get(juzNumber) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    if (!db) return;
    const cached = versesByJuzCache.get(juzNumber);
    if (cached) {
      setVerses(cached);
      return;
    }
    getVersesByJuz(db, juzNumber).then((rows) => {
      if (!cancelled) {
        versesByJuzCache.set(juzNumber, rows);
        setVerses(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db, juzNumber]);

  return verses;
}

function ParaPage({
  juzNumber,
  initialVerseId,
  onVerseChange,
  onLoaded,
}: {
  juzNumber: number;
  initialVerseId?: number;
  onVerseChange?: (verseId: number) => void;
  onLoaded?: (juzNumber: number, verses: DbVerse[]) => void;
}) {
  const db = useSQLiteContext();
  const verses = useVersesForJuz(db, juzNumber);

  const scrollRef = useRef<ScrollView>(null);
  const offsetMapRef = useRef<{ id: number; y: number }[]>([]);
  const didScrollToInitialRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (verses) {
      onLoaded?.(juzNumber, verses);
    }
  }, [verses, juzNumber, onLoaded]);

  const handleOnScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        let currentId: number | null = null;
        const offsets = offsetMapRef.current;
        for (const entry of offsets) {
          if (entry.y <= y + 8) {
            currentId = entry.id;
          } else {
            break;
          }
        }
        if (currentId != null) {
          onVerseChange?.(currentId);
        }
      });
    },
    [onVerseChange],
  );

  const handleVerseLayout = useCallback(
    (verseId: number, e: LayoutChangeEvent) => {
      const entry = offsetMapRef.current.find((o) => o.id === verseId);
      if (entry) {
        entry.y = e.nativeEvent.layout.y;
      } else {
        offsetMapRef.current.push({ id: verseId, y: e.nativeEvent.layout.y });
      }
      offsetMapRef.current.sort((a, b) => a.y - b.y);

      if (
        !didScrollToInitialRef.current &&
        initialVerseId &&
        verses
      ) {
        const targetIdx = verses.findIndex((v) => v.id === initialVerseId);
        if (targetIdx > 0) {
          const targetOffset = offsetMapRef.current.find(
            (o) => o.id === initialVerseId,
          );
          if (targetOffset) {
            didScrollToInitialRef.current = true;
            scrollRef.current?.scrollTo({
              y: Math.max(targetOffset.y - 8, 0),
              animated: false,
            });
          }
        }
      }
    },
    [initialVerseId, verses],
  );

  if (!verses) {
    return (
      <View
        style={{ width: SCREEN_WIDTH }}
        className="flex-1 items-center justify-center"
      >
        <ActivityIndicator size="large" color="#e0bd5e" />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ width: SCREEN_WIDTH }}
      contentContainerClassName="px-4 pb-32"
      showsVerticalScrollIndicator={false}
      onScroll={handleOnScroll}
      scrollEventThrottle={16}
    >
      <Text style={{ writingDirection: "rtl" }}>
        {verses.map((v) => (
          <QuranAyahView
            key={v.id}
            verseNumber={v.verse_number}
            textUthmani={v.text_uthmani}
            onLayout={(e) => handleVerseLayout(v.id, e)}
          />
        ))}
      </Text>
    </ScrollView>
  );
}

export default function ArabicParaReader() {
  const { id, verse } = useLocalSearchParams<{ id: string; verse?: string }>();
  const router = useRouter();
  const initialJuz = parseInt(id ?? "1", 10);
  const initialVerseId = verse ? parseInt(verse, 10) : undefined;
  const { saveProgress } = useQuranArabicProgress();

  const initialIndex = sortedJuzs.findIndex(
    (j) => j.juz_number === initialJuz,
  );

  const flatListRef = useRef<FlatList<JuzMeta>>(null);
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0,
  );
  const currentIndexRef = useRef(currentIndex);
  const [ready, setReady] = useState(false);
  const versesCacheRef = useRef<Record<number, DbVerse[]>>({});
  const [, setVerseCacheVersion] = useState(0);

  const currentJuz = sortedJuzs[currentIndex] ?? null;

  const onJuzLoaded = useCallback(
    (juzNumber: number, verses: DbVerse[]) => {
      versesCacheRef.current[juzNumber] = verses;
      setVerseCacheVersion((v) => v + 1);
    },
    [],
  );

  const getJuzVerses = useCallback((juzNumber: number): DbVerse[] => {
    return versesCacheRef.current[juzNumber] ?? [];
  }, []);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const currentVerseIdRef = useRef<number | null>(null);
  const [currentVerseId, setCurrentVerseId] = useState<number | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPosition = useCallback(
    (juzNumber: number, verseId: number) => {
      saveProgress(juzNumber, verseId);
      setSavedToast(true);
      if (savedToastTimerRef.current) clearTimeout(savedToastTimerRef.current);
      savedToastTimerRef.current = setTimeout(() => setSavedToast(false), 1500);
    },
    [saveProgress],
  );

  const saveCurrentPosition = useCallback(() => {
    const juz = sortedJuzs[currentIndexRef.current];
    if (!juz) return;

    const verseId =
      currentVerseIdRef.current ?? getJuzVerses(juz.juz_number)[0]?.id;
    if (verseId) {
      persistPosition(juz.juz_number, verseId);
    }
  }, [getJuzVerses, persistPosition]);

  const onVerseChange = useCallback(
    (verseId: number) => {
      currentVerseIdRef.current = verseId;
      setCurrentVerseId(verseId);
      const juz = sortedJuzs[currentIndexRef.current];
      if (juz) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          saveProgress(juz.juz_number, verseId);
        }, 1200);
      }
    },
    [saveProgress, sortedJuzs],
  );

  const progress =
    currentJuz && currentVerseId != null
      ? ((() => {
          const verses = getJuzVerses(currentJuz.juz_number);
          const idx = verses.findIndex((v) => v.id === currentVerseId);
          return idx >= 0 ? ((idx + 1) / verses.length) * 100 : 0;
        })())
      : 0;

  const onMomentumEnd = useCallback(
    (e: any) => {
      const index = Math.round(
        e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      setCurrentIndex(index);
      currentIndexRef.current = index;
    },
    [],
  );

  const navigateToJuz = useCallback(
    (n: number) => {
      setPickerVisible(false);
      const idx = sortedJuzs.findIndex((j) => j.juz_number === n);
      if (idx >= 0) {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        setCurrentIndex(idx);
        currentIndexRef.current = idx;
      }
    },
    [],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      saveCurrentPosition();
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [router, saveCurrentPosition]);

  // Fallback: persist the last seen position on unmount so "Continue Reading"
  // always works even if the user navigates away without pressing Save.
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (savedToastTimerRef.current) clearTimeout(savedToastTimerRef.current);
      saveCurrentPosition();
    };
  }, [saveCurrentPosition]);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0a0e1c]">
        <ActivityIndicator size="large" color="#e0bd5e" />
        <Text className="mt-4 text-sm text-neutral-400">Loading Para...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0e1c]">
      <View className="px-4 pb-2 pt-14">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-white">
              {currentJuz
                ? `Para ${currentJuz.juz_number}`
                : "Loading..."}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-gold-500/15"
          >
            <MaterialIcons name="list" size={20} color="#e0bd5e" />
          </TouchableOpacity>
        </View>
        <View className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10">
          <View
            className="h-full rounded-full bg-gold-400"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

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
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        renderItem={({ item }) => (
          <ParaPage
            juzNumber={item.juz_number}
            initialVerseId={
              item.juz_number === initialJuz ? initialVerseId : undefined
            }
            onVerseChange={onVerseChange}
            onLoaded={onJuzLoaded}
          />
        )}
      />

      <View className="absolute bottom-6 right-5 items-end">
        {savedToast && (
          <View className="mb-2 rounded-full bg-white/10 px-3 py-2">
            <Text className="text-xs font-medium text-white">
              Position saved
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={saveCurrentPosition}
          accessibilityLabel="Save reading position"
          accessibilityRole="button"
          activeOpacity={0.8}
          className="h-14 w-14 items-center justify-center rounded-full bg-gold-500 shadow-lg shadow-black/40"
        >
          <MaterialIcons
            name={savedToast ? "check" : "bookmark-add"}
            size={24}
            color="#0a0e1c"
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-1/2 rounded-t-3xl bg-[#0a0e1c]">
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
                      ? "border-gold-400/40 bg-gold-500/20"
                      : "border-white/10 bg-[#101729]"
                  }`}
                >
                  <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-gold-500/15">
                    <Text className="text-lg font-bold text-gold-400">
                      {toArabicNumeral(j.juz_number)}
                    </Text>
                  </View>
                  <Text className="text-base font-bold text-white">
                    Para {j.juz_number}
                  </Text>
                  <Text className="mt-1 text-xs text-neutral-500">
                    {j.verses_count} aayah
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
