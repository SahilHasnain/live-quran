# Quran.com API v4 Reference

Base URL: `https://api.quran.com/api/v4`

> **Note**: The newer Quran Foundation API (`apis.quran.foundation`) requires OAuth2 client credentials (client ID + token). The legacy `api.quran.com` domain still works without authentication for read-only content access.

---

## 1. Chapters / Surahs

### List all chapters

```
GET /chapters
```

**Response:**

```json
{
  "chapters": [
    {
      "id": 1,
      "revelation_place": "makkah",
      "revelation_order": 5,
      "bismillah_pre": false,
      "name_simple": "Al-Fatihah",
      "name_complex": "Al-Fātiĥah",
      "name_arabic": "الفاتحة",
      "verses_count": 7,
      "pages": [1, 1],
      "translated_name": {
        "language_name": "english",
        "name": "The Opener"
      }
    }
  ]
}
```

**Key fields:**

| Field | Description |
|---|---|
| `id` | Chapter number (1–114) |
| `revelation_place` | `"makkah"` or `"madinah"` |
| `revelation_order` | Chronological order of revelation |
| `bismillah_pre` | Whether "Bismillah" is recited before this surah. **`false` for Surah 1** (Fatihah's ayah 1 IS the Bismillah), `true` for all others. |
| `name_arabic` | Arabic name |
| `name_simple` | Transliterated name (ASCII) |
| `name_complex` | Transliterated name (with diacritics) |
| `verses_count` | Total number of ayahs |
| `pages` | [startPage, endPage] in standard Madinah Mushaf |
| `translated_name` | English meaning of the surah name |

### Get a single chapter

```
GET /chapters/{id}
```

Response is same structure, wrapped in `{ "chapter": { ... } }`.

---

## 2. Verses — Text

### Get Uthmani text for a chapter (NO AUTH NEEDED)

```
GET /quran/verses/uthmani?chapter_number={chapterId}
```

Returns all verses for a chapter **without pagination**. Each verse contains the standard Uthmani script text.

**Response:**

```json
{
  "verses": [
    {
      "id": 1,
      "verse_key": "1:1",
      "text_uthmani": "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"
    },
    {
      "id": 2,
      "verse_key": "1:2",
      "text_uthmani": "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ"
    }
  ],
  "meta": {
    "filters": {
      "chapter_number": "1"
    }
  }
}
```

**Key fields:**

| Field | Description |
|---|---|
| `id` | Global verse ID (unique across entire Quran) |
| `verse_key` | `"{chapter}:{verse}"` format |
| `text_uthmani` | Verse text in Uthmani script (proper Unicode, renders on any system with Arabic support) |

**Other text script endpoints** (same response structure, different field):

| Endpoint | Text Field |
|---|---|
| `/quran/verses/uthmani?chapter_number={id}` | `text_uthmani` |
| `/quran/verses/uthmani_simple?chapter_number={id}` | `text_uthmani_simple` |
| `/quran/verses/imlaei?chapter_number={id}` | `text_imlaei` |
| `/quran/verses/indopak?chapter_number={id}` | `text_indopak` |

### Get verses with full metadata (words, translations, tafsir)

```
GET /verses/by_chapter/{chapterId}?words=true&translations={ids}&tafsirs={ids}
```

This endpoint returns paginated results. Use `&per_page=all` to disable pagination (works on `api.quran.com`).

**Query parameters:**

| Param | Description |
|---|---|
| `words` | `true` to include word-by-word data |
| `word_fields` | Comma-separated: `code_v1`, `code_v2`, `text_qpc_hafs`, `text_uthmani`, `text_indopak` |
| `translations` | Comma-separated translation resource IDs (see `/resources/translations`) |
| `tafsirs` | Comma-separated tafsir IDs |
| `per_page` | Results per page (default 25, max 50). Use `all` to get everything. |
| `page` | Page number for pagination |

**Response (with `words=true`):**

```json
{
  "verses": [
    {
      "id": 1,
      "verse_number": 1,
      "verse_key": "1:1",
      "chapter_id": 1,
      "juz_number": 1,
      "hizb_number": 1,
      "rub_el_hizb_number": 1,
      "page_number": 1,
      "text_uthmani": "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
      "text_uthmani_simple": "بسم الله الرحمن الرحيم",
      "text_imlaei": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "text_indopak": "بِسۡمِ اللهِ الرَّحۡمٰنِ الرَّحِيۡمِ",
      "words": [
        {
          "id": 1,
          "position": 1,
          "audio_url": "wbw/001_001_001.mp3",
          "char_type_name": "word",
          "code_v1": "ﭑ",
          "code_v2": "...",
          "text": "ﭑ",
          "translation": {
            "text": "In (the) name",
            "language_name": "english"
          },
          "transliteration": {
            "text": "bis'mi",
            "language_name": "english"
          }
        }
      ],
      "translations": [
        {
          "resource_id": 131,
          "text": "In the Name of Allah—the Most Compassionate, Most Merciful."
        }
      ],
      "tafsirs": [
        {
          "id": 82641,
          "resource_id": 169,
          "language_name": "english",
          "name": "Tafsir Ibn Kathir",
          "text": "<h2>..."
        }
      ]
    }
  ],
  "pagination": {
    "per_page": 25,
    "current_page": 1,
    "next_page": 2,
    "total_pages": 1,
    "total_records": 7
  }
}
```

**Word fields:**

| Field | Description | Font Type |
|---|---|---|
| `code_v1` | QCF V1 glyph codes (Unicode PUA) | Needs QCF V1 font |
| `code_v2` | QCF V2 glyph codes (Unicode PUA) | Needs QCF V2 font |
| `text_qpc_hafs` | QPC Hafs Unicode text | Any Arabic-supporting font |
| `text_uthmani` | Uthmani script | Standard Unicode |
| `text_indopak` | IndoPak script | Standard Unicode |
| `char_type_name` | `"word"`, `"end"` (ayah marker), `"pause"` | — |

### Get verses by page

```
GET /verses/by_page/{pageNumber}?words=true
```

Returns verses that appear on a specific Madinah Mushaf page number (1–604).

---

## 3. Audio / Recitations

### Get verse-by-verse audio for a chapter

```
GET /recitations/{recitationId}/by_chapter/{chapterId}
```

**Example recitation IDs:**

| ID | Reciter |
|---|---|
| 1 | AbdulBaset AbdulSamad (Murattal) |
| 2 | AbdulBaset AbdulSamad (Mujawwad) |
| 7 | Mishary Rashid Al-Afasy |
| 8 | Sa`ud ash-Shuraym |

**Response:**

```json
{
  "audio_files": [
    {
      "verse_key": "1:1",
      "url": "https://verses.quran.foundation/Alafasy/mp3/001001.mp3"
    }
  ],
  "pagination": {
    "per_page": 10,
    "current_page": 1,
    "next_page": 2,
    "total_pages": 1,
    "total_records": 7
  }
}
```

### List available recitations

```
GET /resources/recitations
```

Returns all available recitations with their IDs, styles (Murattal/Mujawwad), and reciter names.

---

## 4. Translations

### List all available translations

```
GET /resources/translations
```

Returns all translation resources with IDs, names, and language info.

**Notable translation IDs:**

| ID | Translation | Language |
|---|---|---|
| 20 | Saheeh International | English |
| 22 | A. Yusuf Ali | English |
| 84 | T. Usmani (Maa'riful Quran) | English |
| 85 | M.A.S. Abdel Haleem | English |
| 95 | A. Maududi (Tafhim) | English |
| 97 | Tafheem e Qur'an (Maududi) | Urdu |
| 131 | Dr. Mustafa Khattab (Clear Quran) | English |
| 203 | Al-Hilali & Khan | English |
| 831 | Abul Ala Maududi (Roman Urdu) | Urdu |

### Get translation for a chapter

```
GET /translations/{resourceId}/by_chapter/{chapterId}
```

Requires authentication on `apis.quran.foundation`. Returns translated text per verse with pagination.

---

## 5. Pages / Mushaf Layout

### Pages lookup

```
GET /pages/lookup?chapter_number={id}&mushaf={mushafId}
```

Returns page boundaries for a given chapter/Mushaf combination.

**Mushaf IDs:**

| ID | Mushaf |
|---|---|
| 1 | QCF V2 (standard Madinah) |
| 3 | IndoPak |
| 4 | Uthmani |
| 6 | IndoPak (reflowed) |
| 7 | IndoPak (alternate) |
| 19 | QCF V4 (tajweed colors) |

**Response:**

```json
{
  "pages": [
    {
      "page_number": 1,
      "verse_key_from": "1:1",
      "verse_key_to": "1:7"
    }
  ],
  "chapter": {
    "chapter_number": 1,
    "mushaf": 1
  }
}
```

---

## 6. Text Script Comparison

| Field | Script | Example ("Bismillah") |
|---|---|---|
| `text_uthmani` | Uthmani (standard) | بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ |
| `text_uthmani_simple` | Uthmani (simplified) | بسم الله الرحمن الرحيم |
| `text_imlaei` | Imlaei (modern spelling) | بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ |
| `text_imlaei_simple` | Imlaei simplified | بسم الله الرحمن الرحيم |
| `text_indopak` | IndoPak script | بِسۡمِ اللهِ الرَّحۡمٰنِ الرَّحِيۡمِ |
| `code_v1` | QCF V1 glyph codes | PUA characters (needs font) |
| `code_v2` | QCF V2 glyph codes | PUA characters (needs font) |
| `text_qpc_hafs` | QPC Hafs Unicode | Standard Unicode |

---

## 7. Usage Notes

### No-auth endpoints (api.quran.com)

These endpoints work without any API key on `api.quran.com`:

| Endpoint | Purpose |
|---|---|
| `GET /chapters` | List all surahs |
| `GET /chapters/{id}` | Single surah details |
| `GET /quran/verses/uthmani?chapter_number={id}` | Uthmani text for a surah |
| `GET /quran/verses/uthmani_simple?chapter_number={id}` | Simplified Uthmani text |
| `GET /quran/verses/imlaei?chapter_number={id}` | Imlaei text |
| `GET /quran/verses/indopak?chapter_number={id}` | IndoPak text |
| `GET /verses/by_chapter/{id}` | Verse metadata (no text unless `words=true`) |
| `GET /verses/by_page/{page}` | Verses on a page |
| `GET /resources/translations` | Available translations |
| `GET /resources/recitations` | Available recitations |

### Bismillah rule

- **Surah 1 (Al-Fatihah):** `bismillah_pre: false`. Verse 1 **is** the Bismillah.
- **Surah 9 (At-Tawbah):** `bismillah_pre: false`. No Bismillah before this surah.
- **All other surahs:** `bismillah_pre: true`. Bismillah is recited before ayah 1 but is NOT ayah 1.

### Verse key parsing

`verse_key` format is `"{chapterNumber}:{verseNumber}"`. Parse with:

```
const [chapter, verse] = verse_key.split(":").map(Number);
```

### Caching

- Chapter list is static (114 surahs, never changes)
- Per-chapter verses are static
- Page lookup data is static per chapter/Mushaf combination
- Cache aggressively using chapter IDs as keys

### Pagination

Some endpoints (`/verses/by_chapter`) paginate by default. Use `per_page=all` to fetch all records at once (works on `api.quran.com`). The newer `apis.quran.foundation` has a max of 50 per page.
