import { QURAN_TOTAL_PAGES, type QuranLang } from "@/data/quran";

export type ManifestLanguage = {
  label: string;
  nativeLabel: string;
  totalPages: number;
  baseUrl: string;
  filePattern: string;
  extension: string;
};

export type QuranManifest = {
  version: string;
  languages: Record<string, ManifestLanguage>;
};

export type QuranLanguageEntry = {
  key: QuranLang;
  label: string;
  nativeLabel: string;
  pages: number;
};

const MANIFEST_URL =
  "https://cdn.jsdelivr.net/gh/SahilHasnain/quran-reader-assets@main/manifest.json";

const FALLBACK_MANIFEST: QuranManifest = {
  version: "2026-06-20",
  languages: {
    "roman-urdu": {
      label: "Roman Urdu",
      nativeLabel: "رومن اردو",
      totalPages: 1207,
      baseUrl:
        "https://cdn.jsdelivr.net/gh/SahilHasnain/quran-reader-assets@main/roman-urdu/pages",
      filePattern: "page-{page}.png",
      extension: "png",
    },
  },
};

let resolvedManifest: QuranManifest | null = null;
let manifestPromise: Promise<QuranManifest> | null = null;

function ensureManifest(): Promise<QuranManifest> {
  if (resolvedManifest) return Promise.resolve(resolvedManifest);
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then((res) => res.json())
      .then((m: QuranManifest) => {
        resolvedManifest = m;
        return m;
      })
      .catch(() => {
        resolvedManifest = FALLBACK_MANIFEST;
        return FALLBACK_MANIFEST;
      });
  }
  return manifestPromise;
}

ensureManifest();

export async function getLanguages(): Promise<QuranLanguageEntry[]> {
  const manifest = await ensureManifest();
  return Object.entries(manifest.languages).map(([key, lang]) => ({
    key: key as QuranLang,
    label: lang.label,
    nativeLabel: lang.nativeLabel,
    pages: lang.totalPages,
  }));
}

export async function getLanguageTotalPages(lang: QuranLang): Promise<number> {
  const manifest = await ensureManifest();
  if (manifest.languages[lang]) {
    return manifest.languages[lang].totalPages;
  }
  return QURAN_TOTAL_PAGES;
}

export function getCachedLanguageTotalPages(lang: QuranLang): number {
  if (resolvedManifest?.languages[lang]) {
    return resolvedManifest.languages[lang].totalPages;
  }
  return QURAN_TOTAL_PAGES;
}

export async function getLanguageEntry(
  lang: QuranLang,
): Promise<{ label: string; nativeLabel: string; pages: number }> {
  const manifest = await ensureManifest();
  const entry = manifest.languages[lang];
  if (entry) {
    return {
      label: entry.label,
      nativeLabel: entry.nativeLabel,
      pages: entry.totalPages,
    };
  }
  return { label: lang, nativeLabel: lang, pages: QURAN_TOTAL_PAGES };
}

export function getCachedLanguageEntry(
  lang: QuranLang,
): { label: string; nativeLabel: string; pages: number } | null {
  if (resolvedManifest?.languages[lang]) {
    const entry = resolvedManifest.languages[lang];
    return {
      label: entry.label,
      nativeLabel: entry.nativeLabel,
      pages: entry.totalPages,
    };
  }
  return null;
}
