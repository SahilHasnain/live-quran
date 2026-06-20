import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import type { QuranLang } from "@/data/quran";

const PROGRESS_KEY = "@quran_last_page";

export function useQuranProgress() {
  const [lastPage, setLastPage] = useState<number>(1);
  const [lastLang, setLastLang] = useState<QuranLang>("roman-urdu");

  useEffect(() => {
    AsyncStorage.getItem(PROGRESS_KEY).then((saved) => {
      if (saved) {
        try {
          const data = JSON.parse(saved) as { page: number; lang: QuranLang };
          setLastPage(data.page);
          setLastLang(data.lang);
        } catch {
          setLastPage(Number(saved));
        }
      }
    });
  }, []);

  const saveProgress = useCallback(async (page: number, lang: QuranLang) => {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ page, lang }));
    setLastPage(page);
    setLastLang(lang);
  }, []);

  return { lastPage, lastLang, saveProgress };
}
