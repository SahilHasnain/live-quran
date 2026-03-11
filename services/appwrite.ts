import { Client, Databases, Query } from "appwrite";

const APPWRITE_ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ||
  "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || "";
const DATABASE_ID = "698e92a6000bac6e6ccd";

const COLLECTIONS = {
  tilawat: "69958c840037f54329ad",
  tafseer: "698e9541000e01bf8db5",
  translation: "6995f0c800001f018b86",
} as const;

const BUCKETS = {
  tilawat: "69958cf3001a3bb3e6dd",
  tafseer: "698e92c5001a5b8a75c0",
  translation: "6995f0f4002cb3539d2a",
} as const;

export type AudioMode = keyof typeof COLLECTIONS;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);

export interface QuranAudio {
  $id: string;
  title: string;
  fileId: string;
  duration: number;
  youtubeId: string;
  thumbnail: string | null;
  uploader: string | null;
  uploadDate: string | null;
}

// Keep old name as alias for backward compat
export type TilawatAudio = QuranAudio;

export function getThumbnailUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
}

export function getAudioFileUrl(fileId: string, mode: AudioMode = "tilawat"): string {
  const bucketId = BUCKETS[mode];
  return `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`;
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export async function fetchAudios(
  mode: AudioMode = "tilawat",
  limit = 25,
  offset = 0,
  search?: string,
): Promise<{ documents: QuranAudio[]; total: number }> {
  const queries = [
    Query.limit(limit),
    Query.offset(offset),
    Query.orderDesc("$createdAt"),
  ];

  if (search && search.trim()) {
    queries.push(Query.search("title", search.trim()));
  }

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS[mode],
    queries,
  );

  return {
    documents: response.documents as unknown as QuranAudio[],
    total: response.total,
  };
}

// Backward compat alias
export const fetchAllTilawatAudios = (
  limit?: number,
  offset?: number,
  search?: string,
) => fetchAudios("tilawat", limit, offset, search);
