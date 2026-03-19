import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AudioMode } from "@/services/appwrite";

export interface HistoryEntry {
  id: string;
  title: string;
  duration: number;
  fileId: string;
  thumbnail?: string | null;
  mode: AudioMode;
  playedAt: number;
  source: "browse" | "downloads";
}

const HISTORY_KEY = "@live_quran_history";
const MAX_HISTORY_ITEMS = 100;

function isSameEntry(a: Pick<HistoryEntry, "id" | "mode">, b: Pick<HistoryEntry, "id" | "mode">) {
  return a.id === b.id && a.mode === b.mode;
}

class HistoryManager {
  private history: HistoryEntry[] = [];
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      const saved = await AsyncStorage.getItem(HISTORY_KEY);
      if (saved) {
        this.history = JSON.parse(saved) as HistoryEntry[];
      }
      this.initialized = true;
    } catch (error) {
      console.error("[HistoryManager] Initialize error:", error);
    }
  }

  async addEntry(entry: Omit<HistoryEntry, "playedAt">) {
    await this.initialize();

    const playedAt = Date.now();
    this.history = this.history.filter((item) => !isSameEntry(item, entry));
    this.history.unshift({ ...entry, playedAt });
    this.history = this.history.slice(0, MAX_HISTORY_ITEMS);

    await this.saveHistory();
  }

  getAllHistory() {
    return [...this.history].sort((a, b) => b.playedAt - a.playedAt);
  }

  getHistoryByMode(mode: AudioMode) {
    return this.getAllHistory().filter((item) => item.mode === mode);
  }

  async clearHistory() {
    this.history = [];
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error("[HistoryManager] Clear error:", error);
    }
  }

  private async saveHistory() {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error("[HistoryManager] Save error:", error);
    }
  }
}

export const historyManager = new HistoryManager();
