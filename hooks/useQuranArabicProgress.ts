import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const PROGRESS_KEY = "@quran_arabic_progress";

interface QuranProgress {
  juzNumber: number;
  verseId: number;
}

export function useQuranArabicProgress() {
  const [progress, setProgress] = useState<QuranProgress | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PROGRESS_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as QuranProgress;
          if (parsed.juzNumber && parsed.verseId) setProgress(parsed);
        } catch {}
      }
    });
  }, []);

  const saveProgress = useCallback(async (juzNumber: number, verseId: number) => {
    const data: QuranProgress = { juzNumber, verseId };
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
    setProgress(data);
  }, []);

  const lastPara = progress?.juzNumber ?? null;
  const lastVerseId = progress?.verseId ?? null;

  return { lastPara, lastVerseId, saveProgress };
}
