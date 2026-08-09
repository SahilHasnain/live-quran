import Database from "better-sqlite3";
import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(
  __dirname,
  "..",
  "reference",
  "decompiled",
  "resources",
  "assets",
  "databases",
  "QuranDB.db"
);
const OUTPUT_DIR = resolve(__dirname, "..", "data", "tafseer");
const TRANSLATION_DIR = resolve(__dirname, "..", "data", "translations");

function stripHtml(html) {
  if (!html) return "";
  // Remove IE conditional comments and XML blocks
  let cleaned = html
    .replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<xml[\s\S]*?<\/xml>/gi, "")
    .replace(/<o:[\s\S]*?<\/o:[^>]+>/gi, "");

  // Convert block-level tags to markers, strip everything, then restore
  cleaned = cleaned
    .replace(/<\/p>/gi, "\x00\x00")
    .replace(/<p[^>]*>/gi, "\x00\x00")
    .replace(/<br\s*\/?>/gi, "\x00");

  // Strip all remaining tags
  let text = cleaned.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "");

  // Collapse ALL whitespace into single spaces (removes mid-paragraph line breaks)
  text = text.replace(/\s+/g, " ");

  // Now restore paragraph breaks from markers
  text = text.replace(/\x00\x00/g, "\n\n");
  text = text.replace(/\x00/g, "\n");

  // Add newlines before { (word-by-word translation blocks)
  text = text.replace(/\s*\{/g, "\n\n{");

  // Add newlines before numbered points like (1)…, (2)…
  text = text.replace(/\s*\((\d+)\)…/g, "\n\n($1)…");

  // Clean up excessive blank lines (max 1 blank line)
  text = text.replace(/\n{3,}/g, "\n\n");
  // Trim leading/trailing whitespace on each line and overall
  text = text.split("\n").map(l => l.trim()).join("\n").trim();

  return text.trim();
}

function cleanTranslation(text) {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  console.log("Opening database:", DB_PATH);
  const db = new Database(DB_PATH, { readonly: true });

  // Get all surahs
  const surahs = db
    .prepare(
      `SELECT surahId, surahName, roman_name, roman_eng_name, surahTotalAyaat, surahParaId FROM surah ORDER BY surahId`
    )
    .all();
  console.log(`Found ${surahs.length} surahs`);

  // Get all aayaat (verse mapping)
  const aayaat = db
    .prepare(`SELECT ayatId, ayatNumber, surahId, paraId, arabicText FROM aayaat`)
    .all();
  const ayatMap = new Map();
  for (const a of aayaat) {
    ayatMap.set(a.ayatId, a);
  }
  console.log(`Loaded ${aayaat.length} ayat mappings`);

  // Get Sirat-ul-Jinan tafseer (typeId = 3)
  const tafseerRows = db
    .prepare(
      `SELECT tafseerId, ayatId, tafseerText FROM tafseer WHERE tafseertypeId = 3 AND tafseerText IS NOT NULL`
    )
    .all();
  console.log(`Found ${tafseerRows.length} Sirat-ul-Jinan tafseer entries`);

  // Get translations for multiple languages
  const translationConfigs = [
    { lang: "en", type: 3, name: "Kanz-ul-Iman (English)" },
    { lang: "si", type: 4, name: "Kanzul Irfan (Sindhi)" },
    { lang: "ps", type: 9, name: "Kanz-ul-Irfan (Pashto)" },
    { lang: "sr", type: 14, name: "Kanzul Irfan (Saraiki)" },
  ];

  const translationsByLang = {};
  for (const cfg of translationConfigs) {
    const rows = db
      .prepare(
        `SELECT id, ayatId, translation FROM translation WHERE language_code = ? AND trans_type = ? AND translation IS NOT NULL`
      )
      .all(cfg.lang, String(cfg.type));
    console.log(`Found ${rows.length} ${cfg.name} entries`);
    translationsByLang[cfg.lang] = { rows, name: cfg.name };
  }

  // Organize tafseer by surah
  const tafseerBySurah = {};

  for (const row of tafseerRows) {
    const ayat = ayatMap.get(row.ayatId);
    if (!ayat) continue;
    const surahId = ayat.surahId;
    if (!tafseerBySurah[surahId]) tafseerBySurah[surahId] = [];

    const verseNumber = ayat.ayatNumber;
    tafseerBySurah[surahId].push({
      ayat_id: row.ayatId,
      verse_number: verseNumber,
      verse_key: `${surahId}:${verseNumber}`,
      text: stripHtml(row.tafseerText),
    });
  }

  // Organize translations by surah for each language
  const translationsByLangBySurah = {};
  for (const [lang, { rows, name }] of Object.entries(translationsByLang)) {
    translationsByLangBySurah[lang] = { name, bySurah: {} };
    for (const row of rows) {
      const ayat = ayatMap.get(row.ayatId);
      if (!ayat) continue;
      const surahId = ayat.surahId;
      if (!translationsByLangBySurah[lang].bySurah[surahId])
        translationsByLangBySurah[lang].bySurah[surahId] = [];

      const verseNumber = ayat.ayatNumber;
      translationsByLangBySurah[lang].bySurah[surahId].push({
        ayat_id: row.id,
        verse_number: verseNumber,
        verse_key: `${surahId}:${verseNumber}`,
        text: cleanTranslation(row.translation),
      });
    }
  }

  // Create output directories
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(TRANSLATION_DIR, { recursive: true });

  // Write per-surah tafseer files
  console.log("\nWriting tafseer files...");
  let totalTafseerSize = 0;
  for (const surah of surahs) {
    const entries = tafseerBySurah[surah.surahId] || [];
    if (entries.length === 0) continue;

    const data = {
      surah_id: surah.surahId,
      surah_name: surah.roman_name,
      surah_name_arabic: surah.surahName,
      surah_name_english: surah.roman_eng_name,
      total_verses: surah.surahTotalAyaat,
      tafseer_name: "Sirat-ul-Jinan",
      tafseer_language: "ur",
      entries_count: entries.length,
      entries,
    };

    const filePath = resolve(OUTPUT_DIR, `${surah.surahId}.json`);
    const json = JSON.stringify(data);
    writeFileSync(filePath, json, "utf-8");
    totalTafseerSize += json.length;
    console.log(
      `  Surah ${surah.surahId} (${surah.roman_name}): ${entries.length} entries`
    );
  }

  // Write per-surah translation files for each language
  console.log("\nWriting translation files...");
  const translationSizes = {};

  for (const [lang, { name, bySurah }] of Object.entries(translationsByLangBySurah)) {
    const langDir = resolve(TRANSLATION_DIR, lang);
    mkdirSync(langDir, { recursive: true });
    let totalSize = 0;
    let totalCount = 0;

    for (const surah of surahs) {
      const entries = bySurah[surah.surahId] || [];
      if (entries.length === 0) continue;

      const data = {
        surah_id: surah.surahId,
        surah_name: surah.roman_name,
        surah_name_arabic: surah.surahName,
        surah_name_english: surah.roman_eng_name,
        total_verses: surah.surahTotalAyaat,
        translation_name: name,
        translation_language: lang,
        entries_count: entries.length,
        entries,
      };

      const filePath = resolve(langDir, `${surah.surahId}.json`);
      const json = JSON.stringify(data);
      writeFileSync(filePath, json, "utf-8");
      totalSize += json.length;
      totalCount += entries.length;
    }

    translationSizes[lang] = { name, size: totalSize, count: totalCount };
    console.log(`  ${name} (${lang}): ${totalCount} entries, ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  }

  // Summary
  console.log("\n=== Extraction Complete ===");
  console.log(
    `Tafseer: ${tafseerRows.length} entries across ${Object.keys(tafseerBySurah).length} surahs (${(totalTafseerSize / 1024 / 1024).toFixed(1)} MB)`
  );
  for (const [lang, { name, size, count }] of Object.entries(translationSizes)) {
    console.log(`${name} (${lang}): ${count} entries (${(size / 1024 / 1024).toFixed(1)} MB)`);
  }
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Output: ${TRANSLATION_DIR}`);

  // Also extract surah metadata for reference
  const surahMeta = surahs.map((s) => ({
    id: s.surahId,
    name: s.surahName,
    transliteration: s.roman_name,
    english_name: s.roman_eng_name,
    total_verses: s.surahTotalAyaat,
    para_id: s.surahParaId,
  }));
  writeFileSync(
    resolve(OUTPUT_DIR, "_surahs.json"),
    JSON.stringify(surahMeta, null, 2),
    "utf-8"
  );

  // Barrel files are no longer generated. The data/*.json output is the source of
  // truth consumed by scripts/build-quran-db.mjs, which produces assets/db/quran.db.
  // Run `npm run build-db` after `npm run extract-tafseer`.

  db.close();
  console.log("\nDone!");
}

main();
