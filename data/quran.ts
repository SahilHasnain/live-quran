const SURAHS = [
  { id: 1, name: "الفاتحة", transliteration: "Al-Fatihah", startPage: 1, endPage: 1, verses: 7 },
  { id: 2, name: "البقرة", transliteration: "Al-Baqarah", startPage: 2, endPage: 49, verses: 286 },
  { id: 3, name: "آل عمران", transliteration: "Aal-e-Imran", startPage: 50, endPage: 76, verses: 200 },
  { id: 4, name: "النساء", transliteration: "An-Nisa", startPage: 77, endPage: 106, verses: 176 },
  { id: 5, name: "المائدة", transliteration: "Al-Ma'idah", startPage: 107, endPage: 127, verses: 120 },
  { id: 6, name: "الأنعام", transliteration: "Al-An'am", startPage: 128, endPage: 150, verses: 165 },
  { id: 7, name: "الأعراف", transliteration: "Al-A'raf", startPage: 151, endPage: 176, verses: 206 },
  { id: 8, name: "الأنفال", transliteration: "Al-Anfal", startPage: 177, endPage: 186, verses: 75 },
  { id: 9, name: "التوبة", transliteration: "At-Tawbah", startPage: 187, endPage: 207, verses: 129 },
  { id: 10, name: "يونس", transliteration: "Yunus", startPage: 208, endPage: 221, verses: 109 },
  { id: 11, name: "هود", transliteration: "Hud", startPage: 222, endPage: 235, verses: 123 },
  { id: 12, name: "يوسف", transliteration: "Yusuf", startPage: 236, endPage: 248, verses: 111 },
  { id: 13, name: "الرعد", transliteration: "Ar-Ra'd", startPage: 249, endPage: 255, verses: 43 },
  { id: 14, name: "إبراهيم", transliteration: "Ibrahim", startPage: 256, endPage: 262, verses: 52 },
  { id: 15, name: "الحجر", transliteration: "Al-Hijr", startPage: 263, endPage: 267, verses: 99 },
  { id: 16, name: "النحل", transliteration: "An-Nahl", startPage: 268, endPage: 281, verses: 128 },
  { id: 17, name: "الإسراء", transliteration: "Al-Isra", startPage: 282, endPage: 293, verses: 111 },
  { id: 18, name: "الكهف", transliteration: "Al-Kahf", startPage: 294, endPage: 304, verses: 110 },
  { id: 19, name: "مريم", transliteration: "Maryam", startPage: 305, endPage: 312, verses: 98 },
  { id: 20, name: "طه", transliteration: "Ta-Ha", startPage: 313, endPage: 321, verses: 135 },
  { id: 21, name: "الأنبياء", transliteration: "Al-Anbiya", startPage: 322, endPage: 331, verses: 112 },
  { id: 22, name: "الحج", transliteration: "Al-Hajj", startPage: 332, endPage: 341, verses: 78 },
  { id: 23, name: "المؤمنون", transliteration: "Al-Mu'minun", startPage: 342, endPage: 349, verses: 118 },
  { id: 24, name: "النور", transliteration: "An-Nur", startPage: 350, endPage: 359, verses: 64 },
  { id: 25, name: "الفرقان", transliteration: "Al-Furqan", startPage: 360, endPage: 366, verses: 77 },
  { id: 26, name: "الشعراء", transliteration: "Ash-Shu'ara", startPage: 367, endPage: 376, verses: 227 },
  { id: 27, name: "النمل", transliteration: "An-Naml", startPage: 377, endPage: 384, verses: 93 },
  { id: 28, name: "القصص", transliteration: "Al-Qasas", startPage: 385, endPage: 393, verses: 88 },
  { id: 29, name: "العنكبوت", transliteration: "Al-Ankabut", startPage: 394, endPage: 399, verses: 69 },
  { id: 30, name: "الروم", transliteration: "Ar-Rum", startPage: 400, endPage: 406, verses: 60 },
  { id: 31, name: "لقمان", transliteration: "Luqman", startPage: 407, endPage: 410, verses: 34 },
  { id: 32, name: "السجدة", transliteration: "As-Sajdah", startPage: 411, endPage: 414, verses: 30 },
  { id: 33, name: "الأحزاب", transliteration: "Al-Ahzab", startPage: 415, endPage: 424, verses: 73 },
  { id: 34, name: "سبإ", transliteration: "Saba", startPage: 425, endPage: 431, verses: 54 },
  { id: 35, name: "فاطر", transliteration: "Fatir", startPage: 432, endPage: 437, verses: 45 },
  { id: 36, name: "يس", transliteration: "Ya-Sin", startPage: 438, endPage: 445, verses: 83 },
  { id: 37, name: "الصافات", transliteration: "As-Saffat", startPage: 446, endPage: 452, verses: 182 },
  { id: 38, name: "ص", transliteration: "Sad", startPage: 453, endPage: 458, verses: 88 },
  { id: 39, name: "الزمر", transliteration: "Az-Zumar", startPage: 459, endPage: 467, verses: 75 },
  { id: 40, name: "غافر", transliteration: "Ghafir", startPage: 468, endPage: 476, verses: 85 },
  { id: 41, name: "فصلت", transliteration: "Fussilat", startPage: 477, endPage: 482, verses: 54 },
  { id: 42, name: "الشورى", transliteration: "Ash-Shura", startPage: 483, endPage: 489, verses: 53 },
  { id: 43, name: "الزخرف", transliteration: "Az-Zukhruf", startPage: 490, endPage: 496, verses: 89 },
  { id: 44, name: "الدخان", transliteration: "Ad-Dukhan", startPage: 497, endPage: 500, verses: 59 },
  { id: 45, name: "الجاثية", transliteration: "Al-Jathiyah", startPage: 501, endPage: 504, verses: 37 },
  { id: 46, name: "الأحقاف", transliteration: "Al-Ahqaf", startPage: 505, endPage: 509, verses: 35 },
  { id: 47, name: "محمد", transliteration: "Muhammad", startPage: 510, endPage: 514, verses: 38 },
  { id: 48, name: "الفتح", transliteration: "Al-Fath", startPage: 515, endPage: 519, verses: 29 },
  { id: 49, name: "الحجرات", transliteration: "Al-Hujurat", startPage: 520, endPage: 523, verses: 18 },
  { id: 50, name: "ق", transliteration: "Qaf", startPage: 524, endPage: 527, verses: 45 },
  { id: 51, name: "الذاريات", transliteration: "Adh-Dhariyat", startPage: 528, endPage: 531, verses: 60 },
  { id: 52, name: "الطور", transliteration: "At-Tur", startPage: 532, endPage: 534, verses: 49 },
  { id: 53, name: "النجم", transliteration: "An-Najm", startPage: 535, endPage: 537, verses: 62 },
  { id: 54, name: "القمر", transliteration: "Al-Qamar", startPage: 538, endPage: 540, verses: 55 },
  { id: 55, name: "الرحمن", transliteration: "Ar-Rahman", startPage: 541, endPage: 543, verses: 78 },
  { id: 56, name: "الواقعة", transliteration: "Al-Waqi'ah", startPage: 544, endPage: 547, verses: 96 },
  { id: 57, name: "الحديد", transliteration: "Al-Hadid", startPage: 548, endPage: 552, verses: 29 },
  { id: 58, name: "المجادلة", transliteration: "Al-Mujadilah", startPage: 553, endPage: 556, verses: 22 },
  { id: 59, name: "الحشر", transliteration: "Al-Hashr", startPage: 557, endPage: 560, verses: 24 },
  { id: 60, name: "الممتحنة", transliteration: "Al-Mumtahanah", startPage: 561, endPage: 563, verses: 13 },
  { id: 61, name: "الصف", transliteration: "As-Saff", startPage: 564, endPage: 566, verses: 14 },
  { id: 62, name: "الجمعة", transliteration: "Al-Jumu'ah", startPage: 567, endPage: 568, verses: 11 },
  { id: 63, name: "المنافقون", transliteration: "Al-Munafiqun", startPage: 569, endPage: 571, verses: 11 },
  { id: 64, name: "التغابن", transliteration: "At-Taghabun", startPage: 572, endPage: 574, verses: 18 },
  { id: 65, name: "الطلاق", transliteration: "At-Talaq", startPage: 575, endPage: 577, verses: 12 },
  { id: 66, name: "التحريم", transliteration: "At-Tahrim", startPage: 578, endPage: 580, verses: 12 },
  { id: 67, name: "الملك", transliteration: "Al-Mulk", startPage: 581, endPage: 583, verses: 30 },
  { id: 68, name: "القلم", transliteration: "Al-Qalam", startPage: 584, endPage: 586, verses: 52 },
  { id: 69, name: "الحاقة", transliteration: "Al-Haqqah", startPage: 587, endPage: 589, verses: 52 },
  { id: 70, name: "المعارج", transliteration: "Al-Ma'arij", startPage: 590, endPage: 592, verses: 44 },
  { id: 71, name: "نوح", transliteration: "Nuh", startPage: 593, endPage: 594, verses: 28 },
  { id: 72, name: "الجن", transliteration: "Al-Jinn", startPage: 595, endPage: 597, verses: 28 },
  { id: 73, name: "المزمل", transliteration: "Al-Muzzammil", startPage: 598, endPage: 599, verses: 20 },
  { id: 74, name: "المدثر", transliteration: "Al-Muddaththir", startPage: 600, endPage: 601, verses: 56 },
  { id: 75, name: "القيامة", transliteration: "Al-Qiyamah", startPage: 602, endPage: 603, verses: 40 },
  { id: 76, name: "الإنسان", transliteration: "Al-Insan", startPage: 604, endPage: 604, verses: 31 },
];

export type QuranLang = "roman-urdu" | "english";

export const QURAN_TOTAL_PAGES = 1207;

export const QURAN_TITLE = "Al-Quran";

export function clampQuranPage(page: number, totalPages = QURAN_TOTAL_PAGES) {
  return Math.min(Math.max(page, 1), totalPages);
}

export function getSurahForPage(page: number) {
  return SURAHS.find(
    (surah) => page >= surah.startPage && page <= surah.endPage,
  ) ?? SURAHS[0];
}

export function getAllSurahs() {
  return SURAHS;
}
