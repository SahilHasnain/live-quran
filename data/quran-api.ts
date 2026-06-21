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

let chaptersCache: ApiChapter[] | null = null;

export async function fetchChapters(): Promise<ApiChapter[]> {
  if (chaptersCache) return chaptersCache;
  const res = await fetch(`${API_BASE}/chapters`);
  const data: ApiChaptersResponse = await res.json();
  chaptersCache = data.chapters;
  return data.chapters;
}

export function getCachedChapters(): ApiChapter[] | null {
  return chaptersCache;
}
