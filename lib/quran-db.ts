import type { SQLiteDatabase } from "expo-sqlite";

export interface DbVerse {
  id: number;
  juz_number: number;
  surah_id: number;
  verse_key: string;
  verse_number: number;
  text_uthmani: string;
}

export interface DbTafseer {
  id: number;
  surah_id: number;
  verse_number: number;
  verse_key: string;
  text: string;
}

export interface DbTranslation {
  id: number;
  lang: string;
  surah_id: number;
  verse_number: number;
  verse_key: string;
  text: string;
}

export interface DbJuz {
  juz_number: number;
  verses_count: number;
}

export function getVersesByJuz(
  db: SQLiteDatabase,
  juz: number,
): Promise<DbVerse[]> {
  return db.getAllAsync<DbVerse>(
    "SELECT * FROM verses WHERE juz_number = ? ORDER BY id",
    juz,
  );
}

export function getFirstVerseByJuz(
  db: SQLiteDatabase,
  juz: number,
): Promise<DbVerse | null> {
  return db.getFirstAsync<DbVerse>(
    "SELECT * FROM verses WHERE juz_number = ? ORDER BY id LIMIT 1",
    juz,
  );
}

export function getVersesBySurah(
  db: SQLiteDatabase,
  surahId: number,
): Promise<DbVerse[]> {
  return db.getAllAsync<DbVerse>(
    "SELECT * FROM verses WHERE surah_id = ? ORDER BY id",
    surahId,
  );
}

export function getTafseerBySurah(
  db: SQLiteDatabase,
  surahId: number,
): Promise<DbTafseer[]> {
  return db.getAllAsync<DbTafseer>(
    "SELECT * FROM tafseer WHERE surah_id = ? ORDER BY verse_number",
    surahId,
  );
}

export function getTranslationsBySurah(
  db: SQLiteDatabase,
  lang: string,
  surahId: number,
): Promise<DbTranslation[]> {
  return db.getAllAsync<DbTranslation>(
    "SELECT * FROM translations WHERE lang = ? AND surah_id = ? ORDER BY verse_number",
    lang,
    surahId,
  );
}

export function getJuzs(db: SQLiteDatabase): Promise<DbJuz[]> {
  return db.getAllAsync<DbJuz>(
    "SELECT juz_number, verses_count FROM juz ORDER BY juz_number",
  );
}