import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_BASE = "https://api.quran.com/api/v4";

const ASSETS_REPO = resolve(__dirname, "..", "..", "quran-reader-assets");
const LOCAL_DATA = resolve(__dirname, "..", "data");

async function main() {
  console.log("Fetching juzs...");
  const juzsRes = await fetch(`${API_BASE}/juzs`);
  const juzsData = await juzsRes.json();
  const seen = new Set();
  const juzs = juzsData.juzs.filter((j) => {
    if (seen.has(j.juz_number)) return false;
    seen.add(j.juz_number);
    return true;
  });

  const allChapterIds = new Set();
  for (const juz of juzs) {
    for (const chId of Object.keys(juz.verse_mapping)) {
      allChapterIds.add(parseInt(chId, 10));
    }
  }

  console.log(`Fetching ${allChapterIds.size} chapters...`);
  const chapterVerses = {};
  let done = 0;
  for (const chId of allChapterIds) {
    const res = await fetch(
      `${API_BASE}/quran/verses/uthmani?chapter_number=${chId}`,
    );
    const data = await res.json();
    chapterVerses[chId] = data.verses.map((v) => ({
      ...v,
      verse_number: parseInt(v.verse_key.split(":")[1] ?? v.verse_key, 10),
    }));
    done++;
    console.log(`  ${done}/${allChapterIds.size} chapters done`);
  }

  console.log("Compiling per-para data...");
  const parasDir = resolve(ASSETS_REPO, "arabic", "paras");
  mkdirSync(parasDir, { recursive: true });

  const all = {};
  for (const juz of juzs) {
    const verses = [];
    for (const [chId, rangeStr] of Object.entries(juz.verse_mapping)) {
      const chapterId = parseInt(chId, 10);
      const parts = rangeStr.split("-");
      if (parts.length !== 2) continue;
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (isNaN(start) || isNaN(end)) continue;
      const chapterData = chapterVerses[chapterId] ?? [];
      for (const v of chapterData) {
        if (v.verse_number >= start && v.verse_number <= end) {
          verses.push(v);
        }
      }
    }
    all[juz.juz_number] = verses;
    const filePath = resolve(parasDir, `${juz.juz_number}.json`);
    writeFileSync(filePath, JSON.stringify(verses), "utf-8");
    console.log(`  Written paras ${juz.juz_number} (${verses.length} verses)`);
  }

  // Copy to live-quran project
  const localParasDir = resolve(LOCAL_DATA, "paras");
  mkdirSync(localParasDir, { recursive: true });
  for (let i = 1; i <= 30; i++) {
    writeFileSync(
      resolve(localParasDir, `${i}.json`),
      JSON.stringify(all[i]),
      "utf-8",
    );
  }

  // Generate juzs metadata JSON
  const juzsMeta = juzs.map((j) => ({
    juz_number: j.juz_number,
    verses_count: j.verses_count,
  }));
  writeFileSync(resolve(LOCAL_DATA, "juzs.json"), JSON.stringify(juzsMeta), "utf-8");

  // The bundled-paras.ts barrel is no longer generated. data/paras/*.json is the
  // source of truth consumed by scripts/build-quran-db.mjs (assets/db/quran.db).
  // Run `npm run build-db` after `npm run bundle-quran`.
  console.log(`Done! Generated data/paras/*.json, data/juzs.json`);
}

main().catch(console.error);
