import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export interface DownloadedAudio {
  id: string;
  title: string;
  duration: number;
  localUri: string;
  thumbnail?: string;
  downloadedAt: number;
  mode: 'tilawat' | 'translation' | 'tafseer';
  fileSize: number;
}

const DOWNLOADS_KEY = '@live_quran_downloads';
const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`;

class DownloadManager {
  private downloads: Map<string, DownloadedAudio> = new Map();
  private downloadCallbacks: Map<string, (progress: number) => void> = new Map();

  async initialize() {
    try {
      // Ensure downloads directory exists
      const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
      }

      // Load saved downloads
      const saved = await AsyncStorage.getItem(DOWNLOADS_KEY);
      if (saved) {
        const parsed: DownloadedAudio[] = JSON.parse(saved);
        parsed.forEach(download => {
          this.downloads.set(download.id, download);
        });
      }
    } catch (error) {
      console.error('[DownloadManager] Initialize error:', error);
    }
  }

  async downloadAudio(
    id: string,
    title: string,
    duration: number,
    audioUrl: string,
    mode: 'tilawat' | 'translation' | 'tafseer',
    thumbnail?: string,
    onProgress?: (progress: number) => void
  ): Promise<DownloadedAudio | null> {
    try {
      // Check if already downloaded
      if (this.downloads.has(id)) {
        return this.downloads.get(id)!;
      }

      const fileName = `${id}.mp3`;
      const localUri = `${DOWNLOADS_DIR}${fileName}`;

      // Register progress callback
      if (onProgress) {
        this.downloadCallbacks.set(id, onProgress);
      }

      // Download file
      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        localUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          const callback = this.downloadCallbacks.get(id);
          if (callback) {
            callback(progress);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        throw new Error('Download failed');
      }

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      // Create download record
      const download: DownloadedAudio = {
        id,
        title,
        duration,
        localUri: result.uri,
        thumbnail,
        downloadedAt: Date.now(),
        mode,
        fileSize
      };

      // Save to memory and storage
      this.downloads.set(id, download);
      await this.saveDownloads();

      // Clean up callback
      this.downloadCallbacks.delete(id);

      return download;
    } catch (error) {
      console.error('[DownloadManager] Download error:', error);
      this.downloadCallbacks.delete(id);
      return null;
    }
  }

  async deleteDownload(id: string): Promise<boolean> {
    try {
      const download = this.downloads.get(id);
      if (!download) return false;

      // Delete file
      await FileSystem.deleteAsync(download.localUri, { idempotent: true });

      // Remove from memory and storage
      this.downloads.delete(id);
      await this.saveDownloads();

      return true;
    } catch (error) {
      console.error('[DownloadManager] Delete error:', error);
      return false;
    }
  }

  isDownloaded(id: string): boolean {
    return this.downloads.has(id);
  }

  getDownload(id: string): DownloadedAudio | undefined {
    return this.downloads.get(id);
  }

  getAllDownloads(): DownloadedAudio[] {
    return Array.from(this.downloads.values()).sort((a, b) => b.downloadedAt - a.downloadedAt);
  }

  getDownloadsByMode(mode: 'tilawat' | 'translation' | 'tafseer'): DownloadedAudio[] {
    return this.getAllDownloads().filter(d => d.mode === mode);
  }

  getTotalSize(): number {
    return Array.from(this.downloads.values()).reduce((sum, d) => sum + d.fileSize, 0);
  }

  async clearAllDownloads(): Promise<boolean> {
    try {
      // Delete all files
      for (const download of this.downloads.values()) {
        await FileSystem.deleteAsync(download.localUri, { idempotent: true });
      }

      // Clear memory and storage
      this.downloads.clear();
      await AsyncStorage.removeItem(DOWNLOADS_KEY);

      return true;
    } catch (error) {
      console.error('[DownloadManager] Clear all error:', error);
      return false;
    }
  }

  private async saveDownloads() {
    try {
      const downloads = Array.from(this.downloads.values());
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
    } catch (error) {
      console.error('[DownloadManager] Save error:', error);
    }
  }
}

export const downloadManager = new DownloadManager();
