import AsyncStorage from "@react-native-async-storage/async-storage";
import TrackPlayer from "@weights-ai/react-native-track-player";

export type QuranMode = "tafseer" | "tilawat" | "translation";

export const LIVE_MODE_KEY = "@mode_live";
export const LIVE_STREAM_TRACK_ID = "live-stream";

const STREAM_CONFIG: Record<
  QuranMode,
  { title: string; url: string }
> = {
  tafseer: {
    title: "Tafseer Radio",
    url: "https://livequran.duckdns.org/tafseer",
  },
  tilawat: {
    title: "Tilawat Radio",
    url: "https://livequran.duckdns.org/tilawat",
  },
  translation: {
    title: "Translation Radio",
    url: "https://livequran.duckdns.org/translation",
  },
};

export function getStreamUrl(mode: QuranMode): string {
  return STREAM_CONFIG[mode]?.url ?? STREAM_CONFIG.tilawat.url;
}

export function getStreamTitle(mode: QuranMode): string {
  return STREAM_CONFIG[mode]?.title ?? STREAM_CONFIG.tilawat.title;
}

export async function getPersistedLiveMode(): Promise<QuranMode> {
  const savedMode = await AsyncStorage.getItem(LIVE_MODE_KEY);
  if (
    savedMode === "tafseer" ||
    savedMode === "tilawat" ||
    savedMode === "translation"
  ) {
    return savedMode;
  }
  return "tilawat";
}

export async function loadLiveStreamTrack(mode: QuranMode): Promise<void> {
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: LIVE_STREAM_TRACK_ID,
    url: getStreamUrl(mode),
    title: getStreamTitle(mode),
    artwork: require("../assets/images/icon.png"),
    isLiveStream: true,
  });
}

export async function reconnectLiveStream(mode?: QuranMode): Promise<QuranMode> {
  const effectiveMode = mode ?? (await getPersistedLiveMode());
  await loadLiveStreamTrack(effectiveMode);
  await TrackPlayer.play();
  return effectiveMode;
}
