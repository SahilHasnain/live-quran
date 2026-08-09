import Database from "better-sqlite3";
import { readFileSync, readdirSync, mkdirSync, rmSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "data");
const ASSET_DIR = resolve(__dirname, "..", "assets", "db");
const DB_PATH = join(ASSET_DIR, "quran.db");

const LANGUAGES = ["en", "si", "ps", "sr"];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function main() {
  rmSync(DB_PATH, { force: true });
  mkdirSync(ASSET_DIR, { recursive: true });
  const db = new Database(DB_PATH);

  console.log("Creating verses table...");
  db.exec(`
    CREATE TABLE verses (
      id INTEGER PRIMARY KEY,
      juz_number INTEGER NOT NULL,
      surah_id INTEGER NOT NULL,
      verse_key TEXT NOT NULL,
      verse_number INTEGER NOT NULL,
      text_uthmani TEXT NOT NULL
    );
    CREATE INDEX idx_verses_juz ON verses(juz_number);
    CREATE INDEX idx_verses_surah ON verses(surah_id);
  `);

  const insertVerse = db.prepare(
    `INSERT INTO verses (id, juz_number, surah_id, verse_key, verse_number, text_uthmani)
     VALUES (@id, @juz_number, @surah_id, @verse_key, @verse_number, @text_uthmani)`,
  );

  let verseCount = 0;
  for (let juz = 1; juz <= 30; juz++) {
    const filePath = join(DATA_DIR, "paras", `${juz}.json`);
    const verses = readJson(filePath);
    const tx = db.transaction((rows) => {
      for (const v of rows) {
        const [surahId] = v.verse_key.split(":").map(Number);
        insertVerse.run({
          id: v.id,
          juz_number: juz,
          surah_id: surahId,
          verse_key: v.verse_key,
          verse_number: v.verse_number,
          text_uthmani: v.text_uthmani,
        });
      }
    });
    tx(verses);
    verseCount += verses.length;
  }
  console.log(`  verses: ${verseCount}`);

  console.log("Creating tafseer table...");
  db.exec(`
    CREATE TABLE tafseer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_id INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      verse_key TEXT NOT NULL,
      text TEXT NOT NULL
    );
    CREATE INDEX idx_tafseer_surah ON tafseer(surah_id);
  `);

  const insertTafseer = db.prepare(
    `INSERT INTO tafseer (surah_id, verse_number, verse_key, text)
     VALUES (@surah_id, @verse_number, @verse_key, @text)`,
  );

  let tafseerCount = 0;
  const sortedTafseerFiles = readdirSync(join(DATA_DIR, "tafseer"))
    .filter((f) => /^\d+\.json$/.test(f))
    .sort((a, b) => Number(a.split(".")[0]) - Number(b.split(".")[0]));
  for (const file of sortedTafseerFiles) {
    const data = readJson(join(DATA_DIR, "tafseer", file));
    const tx = db.transaction((rows) => {
      for (const entry of rows) {
        insertTafseer.run({
          surah_id: data.surah_id,
          verse_number: entry.verse_number,
          verse_key: entry.verse_key,
          text: entry.text,
        });
      }
    });
    tx(data.entries ?? []);
    tafseerCount += data.entries?.length ?? 0;
  }
  console.log(`  tafseer: ${tafseerCount}`);

  console.log("Creating translations table...");
  db.exec(`
    CREATE TABLE translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lang TEXT NOT NULL,
      surah_id INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      verse_key TEXT NOT NULL,
      text TEXT NOT NULL
    );
    CREATE INDEX idx_translations_lang_surah ON translations(lang, surah_id);
  `);

  const insertTranslation = db.prepare(
    `INSERT INTO translations (lang, surah_id, verse_number, verse_key, text)
     VALUES (@lang, @surah_id, @verse_number, @verse_key, @text)`,
  );

  const translationCounts = {};
  for (const lang of LANGUAGES) {
    let count = 0;
    const langDir = join(DATA_DIR, "translations", lang);
    const files = readdirSync(langDir).filter((f) => /^\d+\.json$/.test(f));
    for (const file of files) {
      const data = readJson(join(langDir, file));
      const tx = db.transaction((rows) => {
        for (const entry of rows) {
          insertTranslation.run({
            lang,
            surah_id: data.surah_id,
            verse_number: entry.verse_number,
            verse_key: entry.verse_key,
            text: entry.text,
          });
        }
      });
      tx(data.entries ?? []);
      count += data.entries?.length ?? 0;
    }
    translationCounts[lang] = count;
    console.log(`  translations ${lang}: ${count}`);
  }

  console.log("Creating juz table...");
  db.exec(`
    CREATE TABLE juz (
      juz_number INTEGER PRIMARY KEY,
      verses_count INTEGER NOT NULL
    );
  `);

  const insertJuz = db.prepare(
    `INSERT INTO juz (juz_number, verses_count) VALUES (@juz_number, @verses_count)`,
  );
  const juzs = readJson(join(DATA_DIR, "juzs.json"));
  const txJuz = db.transaction((rows) => {
    for (const j of rows) insertJuz.run(j);
  });
  txJuz(juzs);
  console.log(`  juz: ${juzs.length}`);

  const pageCount = Number(db.pragma("page_count", { simple: true }));
  const pageSize = Number(db.pragma("page_size", { simple: true }));
  db.close();
  console.log(
    `\nDone! ${DB_PATH} (${((pageCount * pageSize) / 1024 / 1024).toFixed(2)} MB)`,
  );
}

main();