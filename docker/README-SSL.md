# HTTPS Setup for Live Quran Streams

This guide explains how to enable HTTPS for your streaming server using Nginx reverse proxy and Let's Encrypt SSL certificates.

## Prerequisites

1. Your domain `livequran.duckdns.org` must point to your server's public IP
2. Ports 80 and 443 must be open in your firewall/router
3. Docker and Docker Compose installed

## Quick Setup

### Step 1: Update Email in Setup Script

Edit `setup-ssl.sh` (Linux/Mac) or `setup-ssl.bat` (Windows) and change:
```bash
EMAIL="your-email@example.com"  # Change to your actual email
```

### Step 2: Run Setup Script

**Linux/Mac:**
```bash
cd docker
chmod +x setup-ssl.sh
./setup-ssl.sh
```

**Windows:**
```cmd
cd docker
setup-ssl.bat
```

### Step 3: Update Your App URLs

After successful setup, update your app to use HTTPS URLs:

```typescript
const TAFSEER_STREAM_URL = "https://livequran.duckdns.org/tafseer";
const TILAWAT_STREAM_URL = "https://livequran.duckdns.org/tilawat";
const TRANSLATION_STREAM_URL = "https://livequran.duckdns.org/translation";
```

## Manual Setup (Alternative)

If the script doesn't work, follow these steps:

### 1. Start Services
```bash
docker-compose up -d
```

### 2. Request Certificate
```bash
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email \
    -d livequran.duckdns.org
```

### 3. Restart Nginx
```bash
docker-compose restart nginx
```

## Certificate Renewal

Certificates auto-renew every 12 hours via the certbot container. To manually renew:

```bash
docker-compose run --rm certbot renew
docker-compose restart nginx
```

## Troubleshooting

### Port Already in Use
If ports 80 or 443 are already in use:
```bash
# Check what's using the ports
netstat -tulpn | grep :80
netstat -tulpn | grep :443

# Stop conflicting services
sudo systemctl stop apache2  # or nginx, if installed
```

### Domain Not Resolving
Verify your domain points to your server:
```bash
nslookup livequran.duckdns.org
ping livequran.duckdns.org
```

### Certificate Request Failed
- Ensure ports 80 and 443 are accessible from the internet
- Check firewall rules
- Verify domain DNS is propagated (can take up to 24 hours)

### Testing HTTPS
```bash
# Test each stream
curl -I https://livequran.duckdns.org/tafseer
curl -I https://livequran.duckdns.org/tilawat
curl -I https://livequran.duckdns.org/translation
```

## Architecture

```
Internet (HTTPS:443)
    ↓
Nginx Reverse Proxy
    ↓
┌─────────────┬─────────────┬─────────────┐
│ Tafseer     │ Tilawat     │ Translation │
│ :8000       │ :8001       │ :8002       │
└─────────────┴─────────────┴─────────────┘
```

## Security Features

- TLS 1.2 and 1.3 only
- Strong cipher suites
- Rate limiting (10 requests/second per IP)
- CORS headers for cross-origin access
- Auto-renewal of certificates

## Removing HTTPS (Rollback)

To go back to HTTP-only setup:

1. Stop and remove nginx/certbot:
```bash
docker-compose stop nginx certbot
docker-compose rm -f nginx certbot
```

2. Remove nginx and certbot sections from `docker-compose.yml`

3. Expose ports directly in docker-compose.yml (already configured as fallback)
