const API_BASE = "https://api.quran.com/api/v4";

export interface ApiChapter {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: number[];
}

export interface ApiVerse {
  id: number;
  verse_key: string;
  text_uthmani: string;
}

export interface ApiVerseWithNumber extends ApiVerse {
  verse_number: number;
}

export interface JuzEntry {
  id: number;
  juz_number: number;
  verse_mapping: Record<string, string>;
  first_verse_id: number;
  last_verse_id: number;
  verses_count: number;
}

interface ApiChaptersResponse {
  chapters: ApiChapter[];
}

interface ApiQuranVersesResponse {
  verses: ApiVerse[];
}

interface ApiJuzsResponse {
  juzs: JuzEntry[];
}

let chaptersCache: ApiChapter[] | null = null;
let versesCache: Record<number, ApiVerseWithNumber[]> = {};
let versesPromiseCache: Record<number, Promise<ApiVerseWithNumber[]> | undefined> = {};
let juzsCache: JuzEntry[] | null = null;

function parseVerseNumber(verseKey: string): number {
  const parts = verseKey.split(":");
  return parseInt(parts[1] ?? parts[0], 10);
}

export async function fetchChapters(): Promise<ApiChapter[]> {
  if (chaptersCache) return chaptersCache;
  const res = await fetch(`${API_BASE}/chapters`);
  const data: ApiChaptersResponse = await res.json();
  chaptersCache = data.chapters;
  return data.chapters;
}

export async function fetchVerses(
  chapterId: number,
): Promise<ApiVerseWithNumber[]> {
  if (versesCache[chapterId]) {
    console.log(`[quran-api] CACHE HIT verses chapter ${chapterId}`);
    return versesCache[chapterId];
  }
  if (versesPromiseCache[chapterId]) {
    console.log(`[quran-api] CACHE HIT (in-flight) verses chapter ${chapterId}`);
    return versesPromiseCache[chapterId];
  }
  console.log(`[quran-api] FETCH verses chapter ${chapterId}`);
  const promise = fetch(
    `${API_BASE}/quran/verses/uthmani?chapter_number=${chapterId}`,
  )
    .then((res) => res.json() as Promise<ApiQuranVersesResponse>)
    .then((data) => {
      const withNumbers = data.verses.map((v) => ({
        ...v,
        verse_number: parseVerseNumber(v.verse_key),
      }));
      versesCache[chapterId] = withNumbers;
      delete versesPromiseCache[chapterId];
      return withNumbers;
    });
  versesPromiseCache[chapterId] = promise;
  return promise;
}

export async function fetchJuzs(): Promise<JuzEntry[]> {
  if (juzsCache) return juzsCache;
  const res = await fetch(`${API_BASE}/juzs`);
  const data: ApiJuzsResponse = await res.json();
  const seen = new Set<number>();
  juzsCache = data.juzs.filter((j) => {
    if (seen.has(j.juz_number)) return false;
    seen.add(j.juz_number);
    return true;
  });
  return juzsCache;
}

export function getCachedJuzs(): JuzEntry[] | null {
  return juzsCache;
}

export function getCachedChapters(): ApiChapter[] | null {
  return chaptersCache;
}

export function getCachedVerses(chapterId: number): ApiVerseWithNumber[] | null {
  return versesCache[chapterId] ?? null;
}

export function clearCache() {
  chaptersCache = null;
  versesCache = {};
}
