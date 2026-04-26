const { Client, Databases, Query } = require("node-appwrite");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const COLLECTIONS = {
  tilawat: {
    collectionId: process.env.APPWRITE_TILAWAT_COLLECTION_ID,
    playlistUrl: process.env.YOUTUBE_TILAWAT_PLAYLIST_URL,
  },
  translation: {
    collectionId: process.env.APPWRITE_TRANSLATION_COLLECTION_ID,
    playlistUrl: process.env.YOUTUBE_TRANSLATION_PLAYLIST_URL,
  },
  tafseer: {
    collectionId: process.env.APPWRITE_TAFSEER_COLLECTION_ID,
    playlistUrl: process.env.YOUTUBE_TAFSEER_PLAYLIST_URL,
  },
};

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

function getPlaylistId(playlistUrl) {
  try {
    const url = new URL(playlistUrl);
    return url.searchParams.get("list");
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\u0600-\u06ff]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(surah|surat|tafseer|tafsir|translation|tilawat|recitation|quran|audio|part)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPlaylistEntries(playlistUrl) {
  const playlistId = getPlaylistId(playlistUrl);
  if (!playlistId) {
    throw new Error(`Invalid playlist URL: ${playlistUrl}`);
  }

  const entries = [];
  let pageToken = "";

  do {
    const apiUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    apiUrl.searchParams.set("part", "snippet");
    apiUrl.searchParams.set("maxResults", "50");
    apiUrl.searchParams.set("playlistId", playlistId);
    apiUrl.searchParams.set("key", YOUTUBE_API_KEY);
    if (pageToken) {
      apiUrl.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`YouTube playlistItems failed with ${response.status}`);
    }

    const data = await response.json();
    for (const item of data.items || []) {
      const snippet = item.snippet || {};
      const resourceId = snippet.resourceId || {};
      entries.push({
        order: Number(snippet.position) + 1,
        youtubeId: resourceId.videoId || null,
        title: snippet.title || "",
        normalizedTitle: normalizeText(snippet.title || ""),
      });
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return entries.sort((a, b) => a.order - b.order);
}

async function listAllDocuments(collectionId) {
  const documents = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await client.call(
      "GET",
      new URL(
        `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents`,
      ),
      {
        "content-type": "application/json",
      },
      {
        queries: [Query.limit(limit), Query.offset(offset)],
      },
    );

    documents.push(...response.documents);
    offset += response.documents.length;

    if (response.documents.length < limit) {
      break;
    }
  }

  return documents;
}

function findPlaylistMatch(document, playlistEntries) {
  if (document.youtubeId) {
    const byYoutubeId = playlistEntries.find(
      (entry) => entry.youtubeId && entry.youtubeId === document.youtubeId,
    );
    if (byYoutubeId) {
      return { entry: byYoutubeId, matchType: "youtubeId" };
    }
  }

  const normalizedTitle = normalizeText(document.title);

  const exactTitle = playlistEntries.find(
    (entry) => entry.normalizedTitle && entry.normalizedTitle === normalizedTitle,
  );
  if (exactTitle) {
    return { entry: exactTitle, matchType: "title" };
  }

  const fuzzyTitle = playlistEntries.find((entry) => {
    if (!normalizedTitle || !entry.normalizedTitle) return false;
    return (
      normalizedTitle.includes(entry.normalizedTitle) ||
      entry.normalizedTitle.includes(normalizedTitle)
    );
  });
  if (fuzzyTitle) {
    return { entry: fuzzyTitle, matchType: "fuzzy-title" };
  }

  return null;
}

function findTitleOnlyPlaylistMatch(document, playlistEntries) {
  const normalizedTitle = normalizeText(document.title);

  const exactTitle = playlistEntries.find(
    (entry) => entry.normalizedTitle && entry.normalizedTitle === normalizedTitle,
  );
  if (exactTitle) {
    return { entry: exactTitle, matchType: "title" };
  }

  const fuzzyTitle = playlistEntries.find((entry) => {
    if (!normalizedTitle || !entry.normalizedTitle) return false;
    return (
      normalizedTitle.includes(entry.normalizedTitle) ||
      entry.normalizedTitle.includes(normalizedTitle)
    );
  });
  if (fuzzyTitle) {
    return { entry: fuzzyTitle, matchType: "fuzzy-title" };
  }

  return null;
}

function extractSurahNumber(title) {
  if (!title) return null;

  const startMatch = title.match(/^\s*(\d{1,3})\b/);
  if (startMatch) {
    const value = Number(startMatch[1]);
    if (value >= 1 && value <= 114) return value;
  }

  const surahMatch = title.match(/\bsurah\s+(\d{1,3})\b/i);
  if (surahMatch) {
    const value = Number(surahMatch[1]);
    if (value >= 1 && value <= 114) return value;
  }

  return null;
}

async function backfillMode(mode, config) {
  if (!config.collectionId || !config.playlistUrl) {
    throw new Error(`Missing configuration for ${mode}`);
  }

  console.log(`\n[${mode}] Fetching playlist order...`);
  const playlistEntries = await fetchPlaylistEntries(config.playlistUrl);
  console.log(`[${mode}] Playlist items: ${playlistEntries.length}`);

  console.log(`[${mode}] Fetching Appwrite documents...`);
  const documents = await listAllDocuments(config.collectionId);
  console.log(`[${mode}] Documents: ${documents.length}`);

  let updated = 0;
  let unchanged = 0;
  const unmatched = [];

  for (const document of documents) {
    const surahOrder =
      mode === "tafseer" ? extractSurahNumber(document.title) : null;
    const match =
      mode === "tafseer"
        ? surahOrder
          ? { entry: { order: surahOrder }, matchType: "surah-number" }
          : findTitleOnlyPlaylistMatch(document, playlistEntries)
        : findPlaylistMatch(document, playlistEntries);
    if (!match) {
      unmatched.push({
        id: document.$id,
        title: document.title,
        youtubeId: document.youtubeId || null,
      });
      continue;
    }

    if (document.order === match.entry.order) {
      unchanged += 1;
      continue;
    }

    await client.call(
      "PATCH",
      new URL(
        `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${config.collectionId}/documents/${document.$id}`,
      ),
      {
        "content-type": "application/json",
      },
      { data: { order: match.entry.order } },
    );

    updated += 1;
    console.log(
      `[${mode}] Updated "${document.title}" -> order ${match.entry.order} (${match.matchType})`,
    );
  }

  console.log(
    `[${mode}] Updated: ${updated}, unchanged: ${unchanged}, unmatched: ${unmatched.length}`,
  );

  if (unmatched.length > 0) {
    console.log(`[${mode}] Unmatched documents:`);
    for (const item of unmatched) {
      console.log(`  - ${item.title} (${item.youtubeId || item.id})`);
    }
  }
}

async function main() {
  if (
    !APPWRITE_ENDPOINT ||
    !APPWRITE_PROJECT_ID ||
    !APPWRITE_API_KEY ||
    !DATABASE_ID ||
    !YOUTUBE_API_KEY
  ) {
    throw new Error("Missing required Appwrite or YouTube configuration in .env.local");
  }

  const modeArg = process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--mode="))
    ?.split("=")[1];

  const modes = modeArg ? [modeArg] : Object.keys(COLLECTIONS);

  for (const mode of modes) {
    if (!COLLECTIONS[mode]) {
      throw new Error(`Unsupported mode: ${mode}`);
    }
    await backfillMode(mode, COLLECTIONS[mode]);
  }
}

main().catch((error) => {
  console.error("\nOrder backfill failed:", error.message);
  process.exit(1);
});
