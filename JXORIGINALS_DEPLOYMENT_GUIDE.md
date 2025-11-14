# 🚀 JxOriginals Complete Deployment Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Testing & Verification](#testing--verification)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide walks you through deploying the **JxOriginals integration** - a complete system for hosting 18 casino games with full source code control, separate from the Innova integration.

### What's Included:
- ✅ **JxOriginals Provider Service** - Handles game launches and sessions
- ✅ **Game Router Service** - Auto-detects provider type (Innova vs JxOriginals)
- ✅ **API Routes & Controllers** - RESTful API for frontend integration
- ✅ **18 Premium Games** - Pragmatic, ISoftBet, and CryptoTech styles
- ✅ **PTWebSocket Servers** - Real-time game communication
- ✅ **Database Migration** - Game data and configuration

---

## ⚙️ Prerequisites

### System Requirements:
- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ running
- ✅ MongoDB 5+ running
- ✅ Redis 6+ running
- ✅ PM2 installed (`npm install -g pm2`)
- ✅ NGINX configured
- ✅ SSL certificates (for WebSocket WSS)

### Environment Variables:
Add these to your `/var/www/html/backend.jackpotx.net/.env`:

```bash
# JxOriginals Configuration
JXORIGINALS_BASE_URL=https://backend.jackpotx.net/JxOriginalGames
JXORIGINALS_WS_URL=wss://backend.jackpotx.net:8443
JXORIGINALS_SECRET_KEY=your_secret_key_here
JXORIGINALS_OPERATOR_ID=your_operator_id_here

# Existing configs (keep these)
SUPPLIER_SECRET_KEY=your_existing_key
SUPPLIER_OPERATOR_ID=your_existing_operator_id
OPERATOR_HOME_URL=https://backend.jackpotx.net
```

---

## 📦 Step-by-Step Deployment

### STEP 1: Database Migration

Run the SQL migration to add all 18 games:

```bash
cd /var/www/html/backend.jackpotx.net

# Run migration
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -f migrations/20241110_add_jxoriginals_games.sql

# Verify games were added
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "SELECT provider, vendor, COUNT(*) as count FROM games WHERE provider = 'JxOriginals' GROUP BY provider, vendor;"
```

**Expected Output:**
```
  provider   |   vendor    | count
-------------+-------------+-------
 JxOriginals | Pragmatic   |     4
 JxOriginals | ISoftBet    |    10
 JxOriginals | CryptoTech  |     2
(3 rows)
```

---

### STEP 2: Install Backend Dependencies

```bash
cd /var/www/html/backend.jackpotx.net

# Install any missing dependencies
npm install

# Build TypeScript
npm run build
```

---

### STEP 3: Configure PTWebSocket

Create WebSocket configuration file:

```bash
cd /var/www/html/backend.jackpotx.net

# Create socket config if doesn't exist
cat > socket_config_jxoriginals.json << 'EOF'
{
  "host": "0.0.0.0",
  "port": 8443,
  "ssl": {
    "enabled": true,
    "cert": "/etc/ssl/certs/jackpotx.net.crt",
    "key": "/etc/ssl/private/jackpotx.net.key"
  },
  "backend": {
    "api_url": "https://backend.jackpotx.net/api/jxoriginals/callback",
    "operator_id": "YOUR_OPERATOR_ID",
    "secret_key": "YOUR_SECRET_KEY"
  },
  "games_path": "/var/www/html/backend.jackpotx.net/JxOriginalGames",
  "redis": {
    "host": "localhost",
    "port": 6379,
    "db": 1
  },
  "database": {
    "host": "localhost",
    "user": "postgres",
    "password": "12358Voot#",
    "database": "jackpotx-db",
    "port": 5432
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "file": "/var/log/jxoriginals-ws.log"
  }
}
EOF
```

---

### STEP 4: Start WebSocket Servers

```bash
cd /var/www/html/backend.jackpotx.net/JxOriginalGames/PTWebSocket

# Install Node.js dependencies for WebSocket servers
npm install

# Start WebSocket servers with PM2
pm2 start Server.js --name "jxoriginals-pragmatic" -- --config ../../socket_config_jxoriginals.json
pm2 start JxOriginals.js --name "jxoriginals-slots" -- --config ../../socket_config_jxoriginals.json
pm2 start Arcade.js --name "jxoriginals-arcade" -- --config ../../socket_config_jxoriginals.json

# Save PM2 configuration
pm2 save

# Check status
pm2 list
```

**Expected Output:**
```
┌─────┬──────────────────────┬─────────┬─────────┐
│ id  │ name                 │ status  │ cpu     │
├─────┼──────────────────────┼─────────┼─────────┤
│ 0   │ backend              │ online  │ 0%      │
│ 1   │ jxoriginals-pragmatic│ online  │ 0%      │
│ 2   │ jxoriginals-slots    │ online  │ 0%      │
│ 3   │ jxoriginals-arcade   │ online  │ 0%      │
└─────┴──────────────────────┴─────────┴─────────┘
```

---

### STEP 5: Restart Backend Server

```bash
cd /var/www/html/backend.jackpotx.net

# Restart backend to load new routes
pm2 restart backend

# Check logs
pm2 logs backend --lines 50
```

Look for these log messages:
```
[JXORIGINALS] Service loaded successfully
[GAME_ROUTER] Service initialized
[APP] JxOriginals routes registered at /api/jxoriginals
```

---

### STEP 6: Configure NGINX

Add location block for JxOriginals games:

```bash
sudo nano /etc/nginx/sites-available/backend.jackpotx.net
```

Add this inside the `server` block:

```nginx
# JxOriginals Games Static Files
location /JxOriginalGames/ {
    alias /var/www/html/backend.jackpotx.net/JxOriginalGames/;

    # PHP processing
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index Server.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $request_filename;
    }

    # Security
    location ~ /\. {
        deny all;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# WebSocket Proxy
location /ws/ {
    proxy_pass https://127.0.0.1:8443/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

Test and reload NGINX:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### STEP 7: Update Game Assets (Optional)

If you don't have game images, create placeholders:

```bash
mkdir -p /var/www/html/cdn.jackpotx.net/games/jxoriginals

# You can add real game images later
# Images should be placed at:
# /cdn/games/jxoriginals/sweet-bonanza.jpg
# /cdn/games/jxoriginals/sweet-bonanza-thumb.jpg
# etc.
```

---

## ✅ Testing & Verification

### Test 1: List Games API

```bash
curl -X GET "https://backend.jackpotx.net/api/jxoriginals/games" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "provider": "JxOriginals",
  "count": 18,
  "games": [...]
}
```

---

### Test 2: Get Categories

```bash
curl -X GET "https://backend.jackpotx.net/api/jxoriginals/categories"
```

**Expected Response:**
```json
{
  "success": true,
  "provider": "JxOriginals",
  "categories": [
    {
      "name": "slots",
      "game_count": 14,
      "games": [...]
    },
    {
      "name": "megaways",
      "game_count": 1,
      "games": [...]
    }
  ]
}
```

---

### Test 3: Launch Game (Authenticated)

First, get a user token:

```bash
# Login
TOKEN=$(curl -X POST "https://backend.jackpotx.net/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

Then launch a game:

```bash
curl -X POST "https://backend.jackpotx.net/api/jxoriginals/launch/101" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currency": "USD",
    "language": "en",
    "mode": "real"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "play_url": "https://backend.jackpotx.net/JxOriginalGames/SweetBonanza/index.html?token=...",
  "game": {...},
  "session": {
    "token": "abc123...",
    "session_id": "jxo_1_101_...",
    "balance": 150.50,
    "websocket_url": "wss://backend.jackpotx.net:8443/pragmatic"
  }
}
```

---

### Test 4: WebSocket Connection

```bash
# Test WebSocket server
wscat -c "wss://backend.jackpotx.net:8443/pragmatic"
```

If you don't have `wscat`, install it:
```bash
npm install -g wscat
```

---

### Test 5: Game Router Integration

```bash
# Test that router detects JxOriginals games correctly
curl -X GET "https://backend.jackpotx.net/api/game/info/101" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "id": 101,
  "name": "Sweet Bonanza",
  "provider": "JxOriginals",
  "provider_type": "jxoriginals",
  "integration_type": "internal",
  ...
}
```

---

## 🔧 Troubleshooting

### Issue 1: Games Not Showing in API

**Problem:** `/api/jxoriginals/games` returns empty array

**Solution:**
```bash
# Check if migration ran successfully
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c \
  "SELECT COUNT(*) FROM games WHERE provider = 'JxOriginals';"

# If count is 0, re-run migration
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -f migrations/20241110_add_jxoriginals_games.sql
```

---

### Issue 2: WebSocket Connection Failed

**Problem:** Games can't connect to WebSocket

**Solution:**
```bash
# Check WebSocket servers are running
pm2 list | grep jxoriginals

# Check logs
pm2 logs jxoriginals-pragmatic --lines 50

# Restart WebSocket servers
pm2 restart jxoriginals-pragmatic jxoriginals-slots jxoriginals-arcade

# Check firewall
sudo ufw status
sudo ufw allow 8443/tcp
```

---

### Issue 3: Game Launch Returns 401

**Problem:** User not authenticated

**Solution:**
```bash
# Verify token is valid
curl -X GET "https://backend.jackpotx.net/api/user/profile" \
  -H "Authorization: Bearer $TOKEN"

# If token expired, login again
```

---

### Issue 4: PHP Games Not Loading

**Problem:** PHP files download instead of execute

**Solution:**
```bash
# Check PHP-FPM is running
sudo systemctl status php8.1-fpm

# Check NGINX PHP configuration
sudo nano /etc/nginx/sites-available/backend.jackpotx.net

# Restart services
sudo systemctl restart php8.1-fpm
sudo systemctl reload nginx
```

---

### Issue 5: Games Show 0 Balance

**Problem:** Balance not loading from MongoDB

**Solution:**
```bash
# Check MongoDB connection
mongo jackpotx --eval "db.category_balances.findOne()"

# Initialize user balance
curl -X POST "https://backend.jackpotx.net/api/user/balance/initialize" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "slots", "initial_balance": 100}'
```

---

## 📊 Monitoring & Logs

### Check All Services Status

```bash
# PM2 processes
pm2 list

# Backend logs
pm2 logs backend --lines 100

# WebSocket logs
pm2 logs jxoriginals-pragmatic --lines 50
pm2 logs jxoriginals-slots --lines 50

# NGINX logs
sudo tail -f /var/log/nginx/backend.jackpotx.net-access.log
sudo tail -f /var/log/nginx/backend.jackpotx.net-error.log

# Database connections
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c \
  "SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = 'jackpotx-db';"
```

---

### Performance Monitoring

```bash
# CPU and Memory usage
pm2 monit

# Database query performance
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c \
  "SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   WHERE query LIKE '%JxOriginals%'
   ORDER BY total_time DESC
   LIMIT 10;"
```

---

## 🎉 Success Checklist

- [ ] Database migration completed (18 games added)
- [ ] Backend server restarted without errors
- [ ] WebSocket servers running (3 servers)
- [ ] NGINX configuration updated and reloaded
- [ ] `/api/jxoriginals/games` returns 18 games
- [ ] `/api/jxoriginals/categories` returns categories
- [ ] Game launch works (returns play_url)
- [ ] WebSocket connection successful
- [ ] Games load in browser/iframe
- [ ] Balance displayed correctly in games
- [ ] Bets and wins process correctly
- [ ] Logs show no errors

---

## 📞 Support & Next Steps

### After Deployment:

1. **Frontend Integration:**
   - Follow `JXORIGINALS_FRONTEND_GUIDE.md`
   - Create JX Originals page in frontend
   - Add to navigation menu

2. **Game Customization:**
   - Modify RTP in `JxOriginalGames/*/SlotSettings.php`
   - Adjust game settings in `JxOriginalGames/*/init.php`
   - Customize reels in `JxOriginalGames/*/reels.txt`

3. **Monitoring:**
   - Set up Grafana dashboards
   - Monitor game performance
   - Track player metrics

4. **Optimization:**
   - Enable Redis caching
   - Configure CDN for game assets
   - Optimize database queries

---

## 🚀 Production Checklist

Before going live:

- [ ] SSL certificates valid and renewed
- [ ] Database backups configured
- [ ] Error monitoring setup (Sentry/Bugsnag)
- [ ] Rate limiting configured
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Disaster recovery plan documented
- [ ] Team trained on troubleshooting
- [ ] Analytics and tracking setup
- [ ] Legal compliance verified (gambling licenses)

---

**Congratulations! Your JxOriginals integration is now live! 🎉🎮**

For questions or issues, check the logs first, then consult:
- Backend service: `/var/www/html/backend.jackpotx.net/src/services/provider/jxoriginals-provider.service.ts`
- Game files: `/var/www/html/backend.jackpotx.net/JxOriginalGames/`
- Documentation: This file and `JXORIGINALS_FRONTEND_GUIDE.md`
