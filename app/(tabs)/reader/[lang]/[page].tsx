import { QuranZoomableImage } from "@/components/QuranZoomableImage";
import { colors } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import {
  clampQuranPage,
  type QuranLang,
} from "@/data/quran";
import {
  getLanguageEntry,
  getCachedLanguageEntry,
} from "@/lib/quran-manifest";
import { useQuranProgress } from "@/hooks/useQuranProgress";
import { useResolvedQuranPage } from "@/hooks/useResolvedQuranPage";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from "react-native";
import { withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH;
const IMAGE_HEIGHT = IMAGE_WIDTH / 0.68;

function QuranReaderPage({
  page,
  lang,
  onZoomChange,
  headerOffset,
}: {
  page: number;
  lang: QuranLang;
  onZoomChange: (isZoomed: boolean) => void;
  headerOffset: number;
}) {
  const { asset, isLoading } = useResolvedQuranPage(page, lang);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [page, lang]);

  if (asset && !hasLoadError) {
    return (
      <View style={[styles.pageSurface, { paddingTop: headerOffset }]}>
        <QuranZoomableImage
          source={{ uri: asset.uri }}
          width={IMAGE_WIDTH}
          height={IMAGE_HEIGHT}
          onZoomChange={onZoomChange}
          onError={() => setHasLoadError(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.pageFallback, { paddingTop: headerOffset }]}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary.light} size="large" />
      ) : null}
      <Text style={styles.fallbackTitle}>
        {isLoading ? "Opening page..." : `Page ${page} not ready yet`}
      </Text>
      <Text style={styles.fallbackText}>
        {isLoading
          ? "The reader is fetching the page image."
          : "This page will appear once the image assets are available."}
      </Text>
    </View>
  );
}

export default function QuranReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string; page?: string }>();
  const insets = useSafeAreaInsets();
  const { translateY: tabBarTranslateY, tabBarHeight } = useTabBarVisibility();

  const lang = (params.lang as QuranLang) || "roman-urdu";
  const cachedLang = getCachedLanguageEntry(lang);
  const [language, setLanguage] = useState(
    cachedLang ?? { label: "Quran", nativeLabel: "Quran", pages: 1207 },
  );
  const totalPages = language.pages;

  useEffect(() => {
    getLanguageEntry(lang).then(setLanguage);
  }, [lang]);
  const initialPage = clampQuranPage(Number(params.page ?? 1) || 1, totalPages);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const flatListRef = useRef<FlatList<number>>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { saveProgress } = useQuranProgress();

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isJumpVisible, setIsJumpVisible] = useState(false);
  const [pageInput, setPageInput] = useState(String(initialPage));

  const bookProgress = (currentPage / totalPages) * 100;
  const headerOffset = insets.top + 60;

  const closeReader = useCallback(() => {
    router.replace("/(tabs)/read" as never);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      tabBarTranslateY.value = withTiming(tabBarHeight + 50, { duration: 200 });

      const backSubscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          closeReader();
          return true;
        },
      );

      return () => {
        backSubscription.remove();
        tabBarTranslateY.value = withTiming(0, { duration: 200 });
      };
    }, [closeReader, tabBarHeight, tabBarTranslateY]),
  );

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void saveProgress(currentPage, lang);
    }, 250);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentPage, lang, saveProgress]);

  const moveToPage = useCallback(
    (page: number, animated = true) => {
      const safePage = clampQuranPage(page, totalPages);
      setCurrentPage(safePage);
      setPageInput(String(safePage));
      flatListRef.current?.scrollToIndex({
        index: safePage - 1,
        animated,
      });
    },
    [totalPages],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const page = viewableItems[0]?.item;
      if (typeof page === "number") {
        setCurrentPage(page);
        setPageInput(String(page));
      }
    },
  ).current;

  const submitJump = () => {
    moveToPage(Number(pageInput) || currentPage);
    setIsJumpVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        ref={flatListRef}
        data={pages}
        keyExtractor={(page) => String(page)}
        renderItem={({ item }) => (
          <QuranReaderPage
            page={item}
            lang={lang}
            onZoomChange={setIsZoomed}
            headerOffset={headerOffset}
          />
        )}
        horizontal
        pagingEnabled
        initialScrollIndex={initialPage - 1}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isZoomed}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(
            () =>
              flatListRef.current?.scrollToIndex({ index, animated: false }),
            100,
          );
        }}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconButton} onPress={closeReader}>
          <MaterialIcons
            name="chevron-left"
            size={22}
            color="rgba(255,255,255,0.9)"
          />
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerMetaRow}>
          <View style={styles.footerTextWrap}>
            <Text style={styles.footerMeta} numberOfLines={1}>
              Page {currentPage} / {totalPages}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${bookProgress}%` },
                ]}
              />
            </View>
          </View>
          <Pressable
            style={styles.jumpButton}
            onPress={() => setIsJumpVisible(true)}
          >
            <MaterialIcons name="search" size={17} color="#03140d" />
            <Text style={styles.jumpButtonText}>Jump</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isJumpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsJumpVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsJumpVisible(false)}
        >
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Jump to Page</Text>
            <TextInput
              value={pageInput}
              onChangeText={setPageInput}
              keyboardType="number-pad"
              placeholder="Page number"
              placeholderTextColor={colors.text.muted}
              style={styles.pageInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => setIsJumpVisible(false)}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryButton}
                onPress={submitJump}
              >
                <Text style={styles.modalPrimaryText}>Open</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  pageSurface: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#050505",
  },
  pageFallback: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    gap: 12,
    backgroundColor: "#050505",
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  fallbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#a3a3a3",
    textAlign: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.84)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  titleWrap: {
    flex: 1,
  },
  readerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "rgba(255,255,255,0.9)",
  },
  readerMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#a3a3a3",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.86)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  footerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  progressTrack: {
    marginTop: 8,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary.light,
  },
  footerMeta: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
  },
  jumpButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.primary.light,
  },
  jumpButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#03140d",
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 14,
  },
  pageInput: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalSecondaryText: {
    fontWeight: "900",
    color: "rgba(255,255,255,0.9)",
  },
  modalPrimaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary.light,
  },
  modalPrimaryText: {
    fontWeight: "900",
    color: "#03140d",
  },
});
