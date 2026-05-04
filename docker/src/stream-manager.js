const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

class StreamManager {
  constructor() {
    this.ffmpegProcess = null;
    this.currentPlaylist = [];
    this.playlistFile = path.join(__dirname, '../playlist.txt');
    this.audioCacheDir = path.join(__dirname, '../audio-cache');
    
    // Environment variables
    this.streamName = process.env.STREAM_NAME || 'radio';
    this.icecastPort = process.env.ICECAST_PORT || 8000;
    this.mountPoint = process.env.MOUNT_POINT || '/live';
    this.streamTitle = process.env.STREAM_TITLE || 'Live Radio';
    this.apiPort = process.env.API_PORT || 3000;
  }

  async initialize() {
    console.log(`[${this.streamName}] Initializing stream manager...`);
    
    // Ensure directories exist
    await fs.ensureDir(this.audioCacheDir);
    
    // Load initial playlist and wait for it to complete
    await this.updatePlaylist();
    
    // Only start stream after playlist is ready
    if (this.currentPlaylist.length > 0) {
      this.startStream();
    } else {
      console.error(`[${this.streamName}] ❌ Cannot start stream - no tracks in playlist`);
    }
    
    // Update playlist every 5 minutes (but don't restart stream)
    setInterval(() => {
      this.updatePlaylist();
    }, 5 * 60 * 1000);
  }

  startTrackRotation() {
    // Not needed - FFmpeg handles continuous playback automatically
    console.log(`[${this.streamName}] 🎵 FFmpeg will handle continuous playback`);
  }

  // No need for manual track rotation - FFmpeg handles this automatically

  async updatePlaylist() {
    try {
      console.log(`[${this.streamName}] Updating playlist...`);
      
      const { Client, Databases, Query } = require('node-appwrite');
      
      // Initialize Appwrite client
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);
      
      // Fetch audio files from collection
      const response = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_COLLECTION_ID,
        [
          Query.limit(100),
          Query.select(["$id", "title", "fileId", "duration"])
        ]
      );
      
      // Convert to playlist format
      this.currentPlaylist = response.documents.map(doc => ({
        id: doc.$id,
        title: doc.title || `Audio ${doc.$id}`,
        audioUrl: `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${doc.fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`,
        duration: doc.duration || 180
      }));
      
      console.log(`[${this.streamName}] Loaded ${this.currentPlaylist.length} tracks for playlist`);
      await this.generateFFmpegPlaylist();
      
    } catch (error) {
      console.error(`[${this.streamName}] Error updating playlist:`, error);
    }
  }

  async generateFFmpegPlaylist() {
    const playlistContent = [];
    
    console.log(`[${this.streamName}] 📥 Caching all ${this.currentPlaylist.length} tracks...`);
    
    // Cache ALL tracks before starting stream
    for (const track of this.currentPlaylist) {
      const cachedFile = await this.cacheAudioFile(track);
      if (cachedFile) {
        playlistContent.push(`file '${cachedFile}'`);
      }
    }
    
    if (playlistContent.length === 0) {
      console.error(`[${this.streamName}] ❌ No tracks available for playlist`);
      return;
    }
    
    await fs.writeFile(this.playlistFile, playlistContent.join('\n'));
    console.log(`[${this.streamName}] ✅ Generated playlist with ${playlistContent.length} tracks`);
  }

  async cacheAudioFile(track) {
    const filename = `${track.id}.mp3`;
    const cachedPath = path.join(this.audioCacheDir, filename);
    
    // Check if already cached
    if (await fs.pathExists(cachedPath)) {
      return cachedPath;
    }
    
    try {
      console.log(`[${this.streamName}] Caching audio: ${track.title}`);
      
      // Download audio file
      const response = await axios({
        method: 'GET',
        url: track.audioUrl,
        responseType: 'stream',
        timeout: 30000
      });
      
      const writer = fs.createWriteStream(cachedPath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(cachedPath));
        writer.on('error', reject);
      });
      
    } catch (error) {
      console.error(`[${this.streamName}] Error caching ${track.title}:`, error.message);
      return null;
    }
  }

  startStream() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill();
    }

    console.log(`[${this.streamName}] Starting FFmpeg Icecast stream...`);
    
    const ffmpegArgs = [
      '-re',                          // Read input at native frame rate
      '-f', 'concat',                 // Concatenate input files
      '-safe', '0',                   // Allow unsafe file paths
      '-stream_loop', '-1',           // Loop playlist infinitely
      '-i', this.playlistFile,        // Input playlist
      '-c:a', 'mp3',                  // Audio codec MP3
      '-b:a', '128k',                 // Audio bitrate
      '-f', 'mp3',                    // MP3 format for Icecast
      '-content_type', 'audio/mpeg',  // Content type
      '-ice_name', this.streamTitle,
      '-ice_description', process.env.STREAM_DESCRIPTION || 'Live Radio Stream',
      '-ice_genre', 'Islamic',
      `icecast://source:hackme@localhost:${this.icecastPort}${this.mountPoint}`
    ];

    console.log(`[${this.streamName}] FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);
    this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    this.ffmpegProcess.stdout.on('data', (data) => {
      console.log(`[${this.streamName}] FFmpeg stdout: ${data.toString().trim()}`);
    });

    this.ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`[${this.streamName}] FFmpeg stderr: ${output}`);
    });

    this.ffmpegProcess.on('close', (code) => {
      console.log(`[${this.streamName}] ❌ FFmpeg process exited with code ${code}`);
      
      // Restart after 5 seconds
      setTimeout(() => {
        console.log(`[${this.streamName}] 🔄 Restarting FFmpeg...`);
        this.startStream();
      }, 5000);
    });

    this.ffmpegProcess.on('error', (error) => {
      console.error(`[${this.streamName}] ❌ FFmpeg spawn error: ${error.message}`);
    });
  }
}

// Start the stream manager
const manager = new StreamManager();
manager.initialize().catch(console.error);
