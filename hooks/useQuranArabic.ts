import juzsList from "@/data/juzs.json";

interface JuzMeta {
  juz_number: number;
  verses_count: number;
}

export function useQuranArabic() {
  const juzs = (juzsList as JuzMeta[]).sort(
    (a, b) => a.juz_number - b.juz_number,
  );

  return {
    juzs,
    loading: false,
    error: null,
    chapters: [],
  };
}
