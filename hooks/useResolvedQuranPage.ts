import { useEffect, useState } from "react";
import { resolveQuranPage, type QuranPageAsset } from "@/lib/quran-page-resolver";
import type { QuranLang } from "@/data/quran";

export function useResolvedQuranPage(page: number, lang: QuranLang) {
  const [asset, setAsset] = useState<QuranPageAsset | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const resolved = resolveQuranPage(page, lang);

    if (!cancelled) {
      setAsset(resolved);
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [page, lang]);

  return { asset, isLoading };
}
