# SQLite Migration Plan — Live Quran

Date: 2026-08-09
Status: In progress

## Problem

~26MB of JSON data (`data/paras/`, `data/tafseer/`, `data/translations/{en,si,ps,sr}/`)
is statically imported via auto-generated barrel files (`data/bundled-*.ts`) and loaded
wholesale into the JS bundle and memory on every app launch. Only three screens consume
this data:

- `app/reader/arabic/[id].tsx` — per-Juz Arabic text (`bundled-paras`)
- `app/reader/tafsir/[id].tsx` — per-Surah Tafsir (`bundled-paras` + `bundled-tafseer`)
- `app/reader/translation/[id].tsx` — per-Surah translations in 4 languages (`bundled-paras` + `bundled-translation-{en,si,ps,sr}`)

Every reader currently imports the **entire** Quran corpus (all 114 surahs × all 4
languages) up front, and the Tafsir/Translation screens scan all 30 paras to collect the
verses of a single surah.

## Goal

Ship the corpus as a bundled **SQLite asset** (`assets/db/quran.db`), open it lazily, and
query only the rows each screen needs. This removes ~26MB of JSON from the JS bundle and
startup memory.

Scope note: mobile-first. Expo web build is out of scope for this work.

## Approach

### 1. Install `expo-sqlite` (~16.0.10, matches Expo SDK 54)

`npx expo install expo-sqlite`. `better-sqlite3` (Node-only, devDependency) is used by the
build script and stays unchanged.

### 2. Bundle the `.db` as a Metro asset

`metro.config.js`: add `db` (and `sqlite`) to `assetExts` so
`require("../../assets/db/quran.db")` resolves.

### 3. Build script `scripts/build-quran-db.mjs`

Reads the existing JSON (the source of truth, no schema changes) and writes
`assets/db/quran.db` using `better-sqlite3`.

Schema:

| Table | Source | Columns | Indexes |
| ----- | ------ | ------- | ------- |
| `verses` | `data/paras/{juz}.json` | `id` PK, `juz_number`, `surah_id`, `verse_key`, `verse_number`, `text_uthmani` | `juz_number`, `surah_id` |
| `tafseer` | `data/tafseer/{surah}.json` entries | `id` PK, `surah_id`, `verse_number`, `verse_key`, `text` | `surah_id` |
| `translations` | `data/translations/{lang}/{surah}.json` entries | `id` PK, `lang`, `surah_id`, `verse_number`, `verse_key`, `text` | `(lang, surah_id)` |
| `juz` | `data/juzs.json` | `juz_number` PK, `verses_count` | — |

`surah_id` is derived from `verse_key` (`"2:255" -> 2`).

New npm script: `"build-db": "node scripts/build-quran-db.mjs"`.

### 4. Data-access layer `lib/quran-db.ts`

`SQLiteProvider` + typed query helpers wrapping `expo-sqlite`, reusing existing shape types
(`BundledVerse`, `TafseerEntry`, `TranslationEntry`):

- `getVersesByJuz(juz)` → `SELECT * FROM verses WHERE juz_number = ? ORDER BY id`
- `getVersesBySurah(surahId)` → `SELECT * FROM verses WHERE surah_id = ? ORDER BY id`
- `getTafseerBySurah(surahId)` → `SELECT * FROM tafseer WHERE surah_id = ?`
- `getTranslationsBySurah(lang, surahId)` → `SELECT * FROM translations WHERE lang = ? AND surah_id = ?`

### 5. Mount `SQLiteProvider` in `app/_layout.tsx`

Wrap the tree with:
`SQLiteProvider databaseName="quran.db" assetSource={{ assetId: require("../../assets/db/quran.db") }}`.

Replace the artificial 600ms "Loading..." delays in the readers with genuine async load
states from the DB.

### 6. Refactor reader screens

- `arabic/[id].tsx` → per-juz `getVersesByJuz()`, same FlatList layout.
- `tafsir/[id].tsx` → `getVersesBySurah()` + `getTafseerBySurah()`, removes the 30-para scan.
- `translation/[id].tsx` → same + `getTranslationsBySurah(lang, surahId)`.
- Memoize per-surah queries (`useMemo` on surahId/lang).

### 7. Cleanup

- Delete `data/bundled-*.ts` (5 files) — auto-generated, no longer referenced.
- Strip barrel-generation blocks from `scripts/extract-tafseer.mjs` and
  `scripts/bundle-quran.mjs` so the giant imports cannot come back.

### 8. Verification

- `npm run build-db` regenerates `assets/db/quran.db`; sanity-check row counts
  (verses ~6,236; tafseer ~114 surahs; translations × 4 langs).
- `npx tsc --noEmit` and `npm run lint`.
- Manual: open a surah in Tafsir/Translation, a Juz in Arabic, switch languages — confirm
  data renders and the JS bundle/startup is leaner.