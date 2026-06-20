import { clampQuranPage, type QuranLang } from "@/data/quran";

export type QuranPageAsset = {
  uri: string;
};

const ASSET_REPO_OWNER = "SahilHasnain";
const ASSET_REPO_NAME = "quran-reader-assets";
const ASSET_REPO_REF = "main";

export function resolveQuranPage(page: number, lang: QuranLang): QuranPageAsset {
  const safePage = clampQuranPage(page);
  const pageToken = String(safePage).padStart(3, "0");
  return {
    uri: `https://cdn.jsdelivr.net/gh/${ASSET_REPO_OWNER}/${ASSET_REPO_NAME}@${ASSET_REPO_REF}/${lang}/pages/page-${pageToken}.png`,
  };
}
