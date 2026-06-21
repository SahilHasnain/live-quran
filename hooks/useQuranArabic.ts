import { useEffect, useState } from "react";
import {
  fetchChapters,
  fetchJuzs,
  type ApiChapter,
  type JuzEntry,
} from "@/data/quran-api";

export function useQuranArabic() {
  const [chapters, setChapters] = useState<ApiChapter[]>([]);
  const [juzs, setJuzs] = useState<JuzEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchChapters(), fetchJuzs()])
      .then(([ch, jz]) => {
        setChapters(ch);
        setJuzs(jz);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  return {
    chapters,
    juzs,
    loading,
    error,
  };
}
