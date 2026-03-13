# Live Quran Radio - Docker Icecast Setup

This Docker setup provides three independent Icecast radio streams for your Live Quran app:
- **Tafseer Radio** (Port 8000/3000)
- **Tilawat Radio** (Port 8001/3001)
- **Translation Radio** (Port 8002/3002)

## Features

- **Icecast Server**: Professional audio streaming server for each stream
- **Node.js API**: Simple health check and stream info API
- **FFmpeg Stream Manager**: Automatic playlist management and continuous streaming
- **Auto-restart**: Resilient streaming with automatic recovery
- **CORS Support**: Cross-origin requests for web/mobile apps
- **Audio Caching**: Downloads and caches audio files for smooth playback
- **Continuous Playback**: FFmpeg handles seamless track transitions automatically

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Mobile App    │───▶│  Icecast     │◀───│  FFmpeg     │
│                 │    │  Server      │    │  Stream     │
└─────────────────┘    │  :8000-8002  │    │  Manager    │
                       └──────────────┘    └─────────────┘
                              │                    │
                              ▼                    ▼
                       ┌──────────────┐    ┌─────────────┐
                       │  Node.js     │    │  Appwrite   │
                       │  API         │───▶│  Database   │
                       │  :3000-3002  │    └─────────────┘
                       └──────────────┘
```

## Quick Start

### 1. Set up environment variables

```bash
cd docker
cp .env.example .env
```

Edit `.env` with your Appwrite credentials:
```env
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DATABASE_ID=your_database_id

# Collection IDs
APPWRITE_TAFSEER_COLLECTION_ID=your_tafseer_collection_id
APPWRITE_TILAWAT_COLLECTION_ID=your_tilawat_collection_id
APPWRITE_TRANSLATION_COLLECTION_ID=your_translation_collection_id

# Bucket IDs
APPWRITE_TAFSEER_BUCKET_ID=your_tafseer_bucket_id
APPWRITE_TILAWAT_BUCKET_ID=your_tilawat_bucket_id
APPWRITE_TRANSLATION_BUCKET_ID=your_translation_bucket_id
```

### 2. Build and run all streams

```bash
docker-compose up --build
```

Or run individual streams:
```bash
# Tafseer only
docker-compose up tafseer-radio

# Tilawat only
docker-compose up tilawat-radio

# Translation only
docker-compose up translation-radio
```

### 3. Access the streams

#### Tafseer Radio
- **Stream URL**: `http://localhost:8000/tafseer`
- **API**: `http://localhost:3000/api/info`
- **Admin**: `http://localhost:8000/admin/`

#### Tilawat Radio
- **Stream URL**: `http://localhost:8001/tilawat`
- **API**: `http://localhost:3001/api/info`
- **Admin**: `http://localhost:8001/admin/`

#### Translation Radio
- **Stream URL**: `http://localhost:8002/translation`
- **API**: `http://localhost:3002/api/info`
- **Admin**: `http://localhost:8002/admin/`

## API Endpoints

### GET /api/info
Returns stream information:
```json
{
  "success": true,
  "streamName": "tafseer",
  "streamTitle": "Live Quran Tafseer Radio",
  "streamUrl": "http://localhost:8000/tafseer",
  "status": "live"
}
```

### GET /health
Health check endpoint for monitoring:
```json
{
  "status": "ok",
  "streamName": "tafseer",
  "timestamp": "2026-03-13T09:00:00.000Z"
}
```

## Configuration

### Icecast Configuration
- **Ports**: 8000 (Tafseer), 8001 (Tilawat), 8002 (Translation)
- **Mount Points**: `/tafseer`, `/tilawat`, `/translation`
- **Admin User**: `admin`
- **Admin Password**: `hackme`
- **Source Password**: `hackme`

### Database Requirements

Each collection should have documents with the following structure:
```json
{
  "$id": "unique_id",
  "title": "Surah Al-Fatiha - Ayah 1",
  "audioFileId": "file_id_in_bucket",
  "duration": 180,
  "surahNumber": 1,
  "ayahNumber": 1
}
```

## Deployment

### Production Deployment

1. **Update environment variables** for production
2. **Change Icecast passwords** in `icecast.xml.template`
3. **Set up reverse proxy** (nginx/caddy) for HTTPS
4. **Configure firewall** to allow ports 8000-8002

### Example Nginx Configuration

```nginx
# Tafseer Stream
server {
    listen 443 ssl;
    server_name tafseer.livequran.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Tafseer API
server {
    listen 443 ssl;
    server_name tafseer-api.livequran.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Update Your App URLs

After deployment, update your `.env.local` in the main app:
```env
EXPO_PUBLIC_TAFSEER_STREAM_URL=https://tafseer.livequran.com/tafseer
EXPO_PUBLIC_TILAWAT_STREAM_URL=https://tilawat.livequran.com/tilawat
EXPO_PUBLIC_TRANSLATION_STREAM_URL=https://translation.livequran.com/translation
```

## Troubleshooting

### Container won't start
1. Check if ports are available:
   ```bash
   netstat -tlnp | grep -E '8000|8001|8002|3000|3001|3002'
   ```
2. Verify environment variables:
   ```bash
   docker-compose config
   ```
3. Check Docker logs:
   ```bash
   docker-compose logs -f tafseer-radio
   ```

### Stream not accessible
1. Ensure firewall allows the ports
2. Test locally:
   ```bash
   curl http://localhost:8000/tafseer
   ```
3. Check Icecast status:
   ```bash
   curl http://localhost:8000/admin/stats.xml
   ```

### No audio playing
1. Verify audio files exist in Appwrite bucket
2. Check collection has documents with `audioFileId`
3. View stream manager logs:
   ```bash
   docker-compose logs -f tafseer-radio | grep "stream-manager"
   ```
4. Check audio cache:
   ```bash
   ls -la docker/audio-cache/tafseer/
   ```

### FFmpeg errors
1. Check playlist file:
   ```bash
   docker exec tafseer-radio cat /app/playlist.txt
   ```
2. Verify audio files are downloadable:
   ```bash
   curl -I "https://sgp.cloud.appwrite.io/v1/storage/buckets/YOUR_BUCKET/files/FILE_ID/view?project=PROJECT_ID"
   ```

## Logs

View logs in real-time:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f tafseer-radio

# Last 100 lines
docker-compose logs --tail=100 tafseer-radio
```

## Maintenance

### Update playlist
The playlist updates automatically every 5 minutes from the Appwrite database.

### Restart services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart tafseer-radio
```

### Clean rebuild
```bash
docker-compose down
docker-compose up --build
```

### Clear audio cache
```bash
rm -rf docker/audio-cache/tafseer/*
rm -rf docker/audio-cache/tilawat/*
rm -rf docker/audio-cache/translation/*
```

## Monitoring

### Check stream status
```bash
# Tafseer
curl http://localhost:3000/health

# Tilawat
curl http://localhost:3001/health

# Translation
curl http://localhost:3002/health
```

### View stream info
```bash
# Tafseer
curl http://localhost:3000/api/info | jq

# Tilawat
curl http://localhost:3001/api/info | jq

# Translation
curl http://localhost:3002/api/info | jq
```

### Icecast statistics
```bash
# Tafseer
curl http://localhost:8000/admin/stats.xml

# Tilawat
curl http://localhost:8001/admin/stats.xml

# Translation
curl http://localhost:8002/admin/stats.xml
```

## Performance Tips

1. **Audio Caching**: Audio files are cached locally to reduce Appwrite bandwidth
2. **Playlist Size**: Limit to 100 tracks per stream for optimal performance
3. **Bitrate**: Default is 128k, adjust in `stream-manager.js` if needed
4. **Update Interval**: Playlist updates every 5 minutes, adjust if needed

## Security Considerations

1. **Change default passwords** in production
2. **Use HTTPS** for all public endpoints
3. **Restrict Icecast admin access** to trusted IPs
4. **Keep Appwrite API key secure** (never commit to git)
5. **Use environment variables** for all sensitive data

## Support

For issues or questions:
1. Check the logs first
2. Verify Appwrite configuration
3. Test with curl commands
4. Review Docker container status

## License

This setup is based on the naat-collection project architecture.
