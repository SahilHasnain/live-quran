# Adding a New Streamer to Icecast Server

This guide walks you through adding a new audio stream (like Translation, Naat, etc.) to your existing Icecast setup.

## Prerequisites

- Existing Icecast server running on DigitalOcean
- SSH access to server: `ssh root@159.89.168.226`
- Appwrite collection and bucket already created for the new content
- Collection ID and Bucket ID from Appwrite

## Step-by-Step Process

### 1. Connect to Server

```bash
ssh root@159.89.168.226
```

### 2. Check Current PM2 Processes

```bash
pm2 status
```

This shows what streamers are currently running.

### 3. Check Existing Streamers

```bash
ls -la /opt/
```

You should see existing streamer directories like `radio-streamer`, `tilawat-streamer`, etc.

### 4. Create New Streamer Directory

Replace `NEW_MODE` with your mode name (e.g., `translation`, `naat`, etc.):

```bash
mkdir -p /opt/NEW_MODE-streamer
cd /opt/NEW_MODE-streamer
```

### 5. Copy Files from Existing Streamer

```bash
cp /opt/tilawat-streamer/package.json .
cp /opt/tilawat-streamer/streamer.js .
```

### 6. Create Environment Configuration

Copy and modify the .env file:

```bash
cp /opt/tilawat-streamer/.env .
```

Update the collection ID, bucket ID, and mount point using sed:

```bash
# Replace OLD_COLLECTION_ID with your new collection ID
sed -i 's/OLD_COLLECTION_ID/NEW_COLLECTION_ID/' .env

# Replace OLD_BUCKET_ID with your new bucket ID
sed -i 's/OLD_BUCKET_ID/NEW_BUCKET_ID/' .env

# Replace mount point (e.g., /tilawat to /translation)
sed -i 's/\/OLD_MOUNT/\/NEW_MOUNT/' .env
```

Example for translation mode:

```bash
sed -i 's/69958c840037f54329ad/6995f0c800001f018b86/' .env
sed -i 's/69958cf3001a3bb3e6dd/6995f0f4002cb3539d2a/' .env
sed -i 's/\/tilawat/\/translation/' .env
```

Verify the .env file:

```bash
cat .env
```

Should look like:

```
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=698e91f800372012b43e
APPWRITE_API_KEY=standard_da657bf87fd39c46b341ff12e23c10e35208dc0f4bd8feacdfc5364a9a5f42a2d27d55805b28bf541b9b323ef26cd0f2487c1494f916fe6d6617a003b45fa1c6870593a73068b85da49c3965e5dfc4de026d4aebe194dc52a774120ce4e0d76885c91cfa9bb5fe7a4c7938d21f91871a1987ff82398a202ea676d4e6e0b951f6
APPWRITE_DATABASE_ID=698e92a6000bac6e6ccd
APPWRITE_COLLECTION_ID=YOUR_NEW_COLLECTION_ID
APPWRITE_BUCKET_ID=YOUR_NEW_BUCKET_ID
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_MOUNT=/YOUR_NEW_MOUNT
ICECAST_SOURCE_PASSWORD=Sahil@9322
```

### 7. Install Dependencies

```bash
npm install
```

### 8. Increase Icecast Source Limit

Check current source limit:

```bash
grep "<sources>" /etc/icecast2/icecast.xml
```

Increase the limit (increment by 1 for each new stream):

```bash
# If current limit is 2, change to 3
sed -i 's/<sources>2<\/sources>/<sources>3<\/sources>/' /etc/icecast2/icecast.xml

# If current limit is 3, change to 4
sed -i 's/<sources>3<\/sources>/<sources>4<\/sources>/' /etc/icecast2/icecast.xml
```

Restart Icecast:

```bash
systemctl restart icecast2
```

### 9. Start Streamer with PM2

```bash
pm2 start streamer.js --name NEW_MODE-radio
pm2 save
```

Example:

```bash
pm2 start streamer.js --name translation-radio
pm2 save
```

### 10. Verify Streamer is Running

```bash
pm2 status
pm2 logs NEW_MODE-radio --lines 20
```

### 11. Check Icecast Status

Wait 10-15 seconds for the first track to download and start streaming:

```bash
sleep 15
curl http://localhost:8000/status-json.xsl
```

You should see your new mount point listed. If not, check logs:

```bash
tail -30 /var/log/icecast2/error.log
```

Common issue: "maximum source limit reached" - go back to Step 8 and increase the limit more.

### 12. Add Nginx Proxy Configuration

Edit the nginx SSL configuration:

```bash
nano /etc/nginx/sites-available/icecast-ssl
```

Add a new location block for your stream:

```nginx
location /YOUR_NEW_MOUNT {
    proxy_pass http://localhost:8000/YOUR_NEW_MOUNT;
    proxy_set_header Host $host;
    proxy_buffering off;
}
```

Or use this command to add it automatically (replace NEW_MOUNT):

```bash
cat > /etc/nginx/sites-available/icecast-ssl << 'EOF'
server {
    listen 443 ssl;
    server_name livequran.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/livequran.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/livequran.duckdns.org/privkey.pem;

    location /stream {
        proxy_pass http://localhost:8000/stream;
        proxy_set_header Host $host;
        proxy_buffering off;
    }

    location /tilawat {
        proxy_pass http://localhost:8000/tilawat;
        proxy_set_header Host $host;
        proxy_buffering off;
    }

    location /translation {
        proxy_pass http://localhost:8000/translation;
        proxy_set_header Host $host;
        proxy_buffering off;
    }

    # Add your new location here
    location /YOUR_NEW_MOUNT {
        proxy_pass http://localhost:8000/YOUR_NEW_MOUNT;
        proxy_set_header Host $host;
        proxy_buffering off;
    }
}
EOF
```

### 13. Test and Reload Nginx

```bash
nginx -t
systemctl reload nginx
```

### 14. Test the Stream

Test locally:

```bash
curl -I http://localhost:8000/YOUR_NEW_MOUNT
```

Test via HTTPS:

```bash
curl -I https://livequran.duckdns.org/YOUR_NEW_MOUNT
```

Should return `HTTP/1.1 200 OK` or `ICY 200 OK`.

### 15. Restart Streamer if Needed

If you get "Bad Request", restart the streamer:

```bash
pm2 restart NEW_MODE-radio
sleep 10
curl http://localhost:8000/status-json.xsl | grep YOUR_NEW_MOUNT
```

## Verification Checklist

- [ ] PM2 shows streamer running: `pm2 status`
- [ ] Icecast shows mount point: `curl http://localhost:8000/status-json.xsl`
- [ ] Local stream works: `curl -I http://localhost:8000/YOUR_NEW_MOUNT`
- [ ] HTTPS stream works: `curl -I https://livequran.duckdns.org/YOUR_NEW_MOUNT`
- [ ] Stream plays in VLC: `vlc https://livequran.duckdns.org/YOUR_NEW_MOUNT`

## Managing the Streamer

### View Logs

```bash
pm2 logs NEW_MODE-radio
pm2 logs NEW_MODE-radio --lines 50
pm2 logs NEW_MODE-radio --err  # errors only
```

### Restart Streamer

```bash
pm2 restart NEW_MODE-radio
```

### Stop Streamer

```bash
pm2 stop NEW_MODE-radio
```

### Start Streamer

```bash
pm2 start NEW_MODE-radio
```

### Delete Streamer

```bash
pm2 delete NEW_MODE-radio
pm2 save
```

## Troubleshooting

### Stream Not Appearing in Icecast

**Problem:** Mount point doesn't show in `status-json.xsl`

**Solution:**

1. Check Icecast logs: `tail -30 /var/log/icecast2/error.log`
2. If you see "maximum source limit reached", increase the limit in Step 8
3. Restart Icecast: `systemctl restart icecast2`
4. Restart streamer: `pm2 restart NEW_MODE-radio`

### FFmpeg Errors

**Problem:** Streamer logs show FFmpeg errors

**Solution:**

1. Check if audio files exist in Appwrite collection
2. Verify collection ID and bucket ID in `.env`
3. Check Appwrite API key is valid
4. Restart streamer: `pm2 restart NEW_MODE-radio`

### Nginx Bad Request

**Problem:** `curl -I https://livequran.duckdns.org/YOUR_NEW_MOUNT` returns 400

**Solution:**

1. Verify mount point exists: `curl http://localhost:8000/status-json.xsl`
2. Check nginx config: `nginx -t`
3. Restart streamer: `pm2 restart NEW_MODE-radio`
4. Wait 10-15 seconds for stream to connect

### "Cannot read properties of undefined (reading 'title')"

**Problem:** Error in logs at startup

**Solution:** This is normal at startup when playlist is empty. It will resolve once audio is fetched. If it persists:

1. Check collection has documents: Log into Appwrite console
2. Verify collection ID in `.env` is correct
3. Check API key has read permissions

## Current Active Streams

- **Tafseer:** `https://livequran.duckdns.org/stream`
- **Tilawat:** `https://livequran.duckdns.org/tilawat`
- **Translation:** `https://livequran.duckdns.org/translation`

## Server Details

- **IP:** 159.89.168.226
- **Domain:** livequran.duckdns.org
- **Icecast Port:** 8000
- **Icecast Password:** Sahil@9322
- **SSL Cert:** Let's Encrypt (auto-renews)

## Notes

- Each streamer runs independently as a PM2 process
- Streamers auto-restart on crash
- Streamers auto-start on server reboot (via PM2 startup)
- All streamers share the same Icecast server
- Maximum concurrent sources is configured in Icecast (currently 3)
- Each stream uses ~50-100MB RAM
- Audio files are temporarily downloaded to `/tmp/` and deleted after streaming
