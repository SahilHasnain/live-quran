# Live Radio Setup Documentation

## What We Accomplished

### 1. Server Setup (DigitalOcean)

**Created Infrastructure:**

- DigitalOcean Droplet: 2GB RAM, 1 CPU, $12/month
- Region: Bangalore (BLR1)
- IP Address: `159.89.168.226`
- OS: Ubuntu 22.04

**Installed Software:**

- Icecast2 (streaming server)
- Node.js 20
- FFmpeg (audio processing)
- PM2 (process manager)

**Icecast Configuration:**

- Hostname: `159.89.168.226`
- Port: `8000`
- Source Password: `Sahil@9322`
- Mount Point: `/stream`
- Stream URL: `http://159.89.168.226:8000/stream`

### 2. Streaming Application

**Created Node.js Streamer:**

- Location: `/opt/radio-streamer/`
- Fetches ALL audio from Appwrite collection
- Downloads audio files from Appwrite Storage
- Streams to Icecast using FFmpeg
- Auto-restarts on failure
- Runs 24/7 as background service

**Key Features:**

- Fetches all audio documents from collection (ordered by creation date)
- Plays complete playlist from first to last
- Downloads MP3 file for each track
- Streams to Icecast with 128kbps bitrate
- Automatically advances to next track
- When playlist ends, refetches and restarts from beginning
- Automatically includes new audio added to Appwrite

**Dependencies:**

```json
{
  "node-appwrite": "^13.0.0",
  "dotenv": "^16.0.0",
  "icecast-stack": "^1.0.0"
}
```

**Environment Variables:**

```
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=698e91f800372012b43e
APPWRITE_API_KEY=standard_da657bf87fd39c46b341ff12e23c10e35208dc0f4bd8feacdfc5364a9a5f42a2d27d55805b28bf541b9b323ef26cd0f2487c1494f916fe6d6617a003b45fa1c6870593a73068b85da49c3965e5dfc4de026d4aebe194dc52a774120ce4e0d76885c91cfa9bb5fe7a4c7938d21f91871a1987ff82398a202ea676d4e6e0b951f6
APPWRITE_DATABASE_ID=698e92a6000bac6e6ccd
APPWRITE_BUCKET_ID=698e92c5001a5b8a75c0
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_SOURCE_PASSWORD=Sahil@9322
ICECAST_MOUNT=/stream
```

**PM2 Service:**

- Service Name: `quran-radio`
- Auto-start on boot: Enabled
- Auto-restart on crash: Enabled
- Logs: `pm2 logs quran-radio`

### 3. Mobile App Updates

**Created New Context:**

- File: `contexts/IcecastRadioContext.tsx`
- Simplified from old LiveRadioContext
- Plays single Icecast stream URL
- No polling, no track management
- Just play/pause/stop controls

**Removed Old Files:**

- `contexts/LiveRadioContext.tsx`
- `contexts/RadioContext.tsx`
- `components/RadioPlayer.tsx`
- `services/liveRadio.ts`
- `types/live-radio.ts`
- `types/quran.ts`
- `lib/appwrite.ts`
- `scripts/` folder
- `functions/` folder

**Updated Files:**

- `app/_layout.tsx` - Uses IcecastRadioProvider
- `app/index.tsx` - Simplified UI for live stream
- `.env.local` - Only stream URL needed

**New Environment Variable:**

```
EXPO_PUBLIC_ICECAST_STREAM_URL=http://159.89.168.226:8000/stream
```

### 4. How It Works

**Architecture:**

```
Appwrite Collection (All Audio)
        ↓
Node.js Streamer (Fetches, Downloads & Streams)
        ↓
Icecast Server (Broadcasts)
        ↓
Mobile App (Plays Stream)
```

**User Experience:**

- All users hear the same audio at the same time
- True live radio experience
- 2-5 second latency
- No pause/rewind (live only)
- Background playback supported
- Works on iOS and Android

**Current Capacity:**

- ~50-100 concurrent listeners
- 128kbps audio quality
- 2GB RAM server

---

## What We Need To Do Next

### 1. Scale for 5000+ Users

**Problem:**

- Current server can only handle ~50-100 concurrent users
- Bandwidth: 128kbps × 5000 users = 640 Mbps (too expensive on DO)
- Server resources insufficient

**Solution: Use a CDN**

#### Option A: Bunny.net Stream (Recommended - Cheapest)

**Cost:** ~$30-50/month for 5000 users

**Setup Steps:**

1. Sign up at bunny.net
2. Create a Stream Pull Zone
3. Point it to your Icecast server: `http://159.89.168.226:8000/stream`
4. Get CDN URL: `https://your-zone.b-cdn.net/stream`
5. Update app to use CDN URL instead of direct IP

**Benefits:**

- Global CDN (fast worldwide)
- Unlimited concurrent users
- $0.01/GB bandwidth
- DDoS protection
- SSL/HTTPS included

**Architecture:**

```
Your DO Server → Bunny.net CDN → 5000+ Users
```

#### Option B: Cloudflare Stream

**Cost:** $1 per 1000 minutes delivered (~$50-100/month)

**Setup Steps:**

1. Sign up for Cloudflare Stream
2. Use Stream Live Input
3. Push from your server to Cloudflare
4. Get HLS/DASH URLs
5. Update app to use Cloudflare URLs

**Benefits:**

- Cloudflare's global network
- Auto-scaling
- Built-in analytics
- More expensive but enterprise-grade

#### Option C: AWS CloudFront + MediaLive

**Cost:** ~$200-500/month

**Setup Steps:**

1. Set up AWS MediaLive input
2. Create MediaPackage channel
3. Configure CloudFront distribution
4. Push stream from your server

**Benefits:**

- Enterprise-grade
- Most scalable
- Most expensive
- Complex setup

### 2. Set Up Naat Collection Stream

**For the second app (naat-collection):**

#### If staying with current setup (<100 users):

1. SSH to DO server
2. Create second streamer: `/opt/naat-streamer/`
3. Copy streamer.js and modify for naat database
4. Update Appwrite credentials for naat collection
5. Use second mount point: `/naat-stream`
6. Start with PM2: `pm2 start naat-streamer.js --name naat-radio`
7. Stream URL: `http://159.89.168.226:8000/naat-stream`

#### If scaling to 5000+ users:

1. Set up CDN (Bunny.net recommended)
2. Create two pull zones:
   - Quran: `https://quran.your-domain.com/stream`
   - Naat: `https://naat.your-domain.com/stream`
3. Both pull from your DO server
4. Update both apps with CDN URLs

### 3. Add Custom Domain (Optional)

**Instead of IP address, use:**

- `https://radio.livequran.com/stream`
- `https://radio.naatcollection.com/stream`

**Steps:**

1. Buy domain (Namecheap, GoDaddy, etc.)
2. Point A record to `159.89.168.226`
3. Set up SSL with Let's Encrypt
4. Configure Icecast for HTTPS
5. Update app URLs

### 4. Monitoring & Analytics

**Add monitoring:**

- Uptime monitoring (UptimeRobot - free)
- Listener count tracking
- Stream health checks
- Error alerting

**Icecast Admin:**

- Access: `http://159.89.168.226:8000/admin/`
- Username: `admin`
- Password: (set during installation)
- View current listeners, stats

### 5. Backup & Redundancy

**For production:**

1. Set up automatic backups (DigitalOcean Backups - $2.40/month)
2. Create server snapshot
3. Document recovery process
4. Consider secondary server in different region

### 6. Optimize Audio Quality

**Current:** 128kbps MP3

**Options:**

- 64kbps for lower bandwidth (mobile-friendly)
- 192kbps for higher quality
- Adaptive bitrate (requires HLS/DASH)

### 7. App Improvements

**Features to add:**

- Show current track metadata
- Display listener count
- Show upcoming tracks
- Add share functionality
- Offline mode (download for later)

---

## Quick Reference

### Server Access

```bash
ssh root@159.89.168.226
```

### Manage Streamer

```bash
# View logs
pm2 logs quran-radio

# Restart
pm2 restart quran-radio

# Stop
pm2 stop quran-radio

# Start
pm2 start quran-radio

# Status
pm2 status
```

### Test Stream

```bash
# In browser
http://159.89.168.226:8000/stream

# In VLC
Media → Open Network Stream → http://159.89.168.226:8000/stream

# Check if Icecast is running
systemctl status icecast2
```

### Update Streamer Code

```bash
cd /opt/radio-streamer
nano streamer.js
# Make changes
pm2 restart quran-radio
```

---

## Costs Summary

### Current Setup

- DigitalOcean Droplet: $12/month
- Total: $12/month
- Capacity: ~50-100 users

### For 5000+ Users (Recommended)

- DigitalOcean Droplet: $12/month
- Bunny.net CDN: $30-50/month
- Total: $42-62/month
- Capacity: Unlimited users

### Alternative for 5000+ Users

- DigitalOcean Droplet: $12/month
- Cloudflare Stream: $50-100/month
- Total: $62-112/month

---

## Support & Troubleshooting

### Stream Not Working

1. Check if Icecast is running: `systemctl status icecast2`
2. Check if streamer is running: `pm2 status`
3. View streamer logs: `pm2 logs quran-radio`
4. Test stream URL in VLC

### No Audio

1. Check if files are downloading: `ls -lh /tmp/*.mp3`
2. Check FFmpeg errors in logs
3. Verify Appwrite credentials
4. Check Icecast password matches

### High CPU/Memory

1. Check current usage: `htop`
2. Restart streamer: `pm2 restart quran-radio`
3. Consider upgrading droplet size

### Stream Cuts Out

1. Check internet connection
2. Check server bandwidth usage
3. Verify audio files aren't corrupted
4. Check Icecast logs: `tail -f /var/log/icecast2/error.log`

---

## Contact Information

**Server Details:**

- Provider: DigitalOcean
- IP: 159.89.168.226
- Region: Bangalore (BLR1)

**Appwrite:**

- Endpoint: https://sgp.cloud.appwrite.io/v1
- Project: 698e91f800372012b43e
- Database: 698e92a6000bac6e6ccd

**Credentials:**

- Stored in: `/opt/radio-streamer/.env`
- Icecast password: Sahil@9322
