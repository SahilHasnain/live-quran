import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import type { QuranLang } from "@/data/quran";

const BOOKMARKS_KEY = "@quran_bookmarks";

export type QuranBookmark = {
  id: string;
  page: number;
  lang: QuranLang;
  label: string;
  createdAt: number;
};

export function useQuranBookmarks() {
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(BOOKMARKS_KEY).then((saved) => {
      if (saved) setBookmarks(JSON.parse(saved));
    });
  }, []);

  const persist = useCallback(async (updated: QuranBookmark[]) => {
    setBookmarks(updated);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  }, []);

  const isBookmarked = useCallback(
    (page: number, lang: QuranLang) =>
      bookmarks.some((b) => b.page === page && b.lang === lang),
    [bookmarks],
  );

  const getBookmarkForPage = useCallback(
    (page: number, lang: QuranLang) =>
      bookmarks.find((b) => b.page === page && b.lang === lang),
    [bookmarks],
  );

  const addBookmark = useCallback(
    async (page: number, lang: QuranLang, label: string) => {
      const existing = bookmarks.find(
        (b) => b.page === page && b.lang === lang,
      );
      if (existing) return;
      const bookmark: QuranBookmark = {
        id: `bm_${lang}_${page}_${Date.now()}`,
        page,
        lang,
        label,
        createdAt: Date.now(),
      };
      await persist([...bookmarks, bookmark]);
    },
    [bookmarks, persist],
  );

  const removeBookmark = useCallback(
    async (page: number, lang: QuranLang) => {
      await persist(
        bookmarks.filter((b) => !(b.page === page && b.lang === lang)),
      );
    },
    [bookmarks, persist],
  );

  const getBookmarks = useCallback(
    (lang?: QuranLang) =>
      lang
        ? bookmarks.filter((b) => b.lang === lang)
        : bookmarks,
    [bookmarks],
  );

  return {
    isBookmarked,
    getBookmarkForPage,
    addBookmark,
    removeBookmark,
    getBookmarks,
  };
}
