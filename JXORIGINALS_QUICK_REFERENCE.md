# 🎮 JX Originals - Quick Reference Guide

**Status:** ✅ PRODUCTION LIVE
**Last Updated:** November 10, 2025

---

## 🚀 Quick Access

### URLs
```
Frontend:  https://jackpotx.net/category/jx-originals
API:       https://backend.jackpotx.net/api/jxoriginals/games
Swagger:   https://backend.jackpotx.net/docs/
```

### Key Paths
```
Backend:   /var/www/html/backend.jackpotx.net/
Games:     /var/www/html/backend.jackpotx.net/JxOriginalGames/
Frontend:  /var/www/html/jackpotx.net/
Docs:      /var/www/html/backend.jackpotx.net/JXORIGINALS_*.md
```

---

## 📊 System Status

### Check All Services
```bash
# PM2 status
sudo -u ubuntu pm2 list

# Expected output:
# backend (port 3001) - online
# frontend - online
# jxoriginals-pragmatic (8443) - online
# jxoriginals-slots (8444) - online
```

### Check Logs
```bash
# Backend logs
sudo -u ubuntu pm2 logs backend --lines 50

# WebSocket logs
sudo -u ubuntu pm2 logs jxoriginals-pragmatic --lines 30
sudo -u ubuntu pm2 logs jxoriginals-slots --lines 30

# NGINX logs
sudo tail -50 /var/log/nginx/backend.jackpotx.net-error.log
```

### Restart Services
```bash
# Restart backend
sudo -u ubuntu pm2 restart backend

# Restart WebSocket servers
sudo -u ubuntu pm2 restart jxoriginals-pragmatic
sudo -u ubuntu pm2 restart jxoriginals-slots

# Restart frontend
sudo -u ubuntu pm2 restart frontend

# Reload NGINX
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🎯 API Endpoints

### Test API
```bash
# List all games
curl https://backend.jackpotx.net/api/jxoriginals/games

# Get featured games
curl https://backend.jackpotx.net/api/jxoriginals/featured?limit=5

# Get vendors
curl https://backend.jackpotx.net/api/jxoriginals/vendors

# Search games
curl "https://backend.jackpotx.net/api/jxoriginals/search?q=olympus"

# Get categories
curl https://backend.jackpotx.net/api/jxoriginals/categories
```

### Response Format
```json
{
  "success": true,
  "provider": "JxOriginals",
  "count": 16,
  "games": [...]
}
```

---

## 🗄️ Database Queries

### Quick Stats
```bash
# Count JX Originals games
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db \
  -c "SELECT COUNT(*) FROM games WHERE provider = 'JxOriginals';"

# List all games
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db \
  -c "SELECT id, name, vendor, rtp_percentage, is_featured FROM games WHERE provider = 'JxOriginals' ORDER BY name;"

# Get featured games
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db \
  -c "SELECT name, rtp_percentage, volatility FROM games WHERE provider = 'JxOriginals' AND is_featured = true;"
```

### Update Game
```sql
-- Update RTP
UPDATE games SET rtp_percentage = 95.00 WHERE game_code = 'sweet_bonanza';

-- Toggle featured
UPDATE games SET is_featured = true WHERE game_code = 'gates_olympus';

-- Update image URLs
UPDATE games SET
  image_url = '/cdn/games/jxoriginals/' || game_code || '.jpg',
  thumbnail_url = '/cdn/games/jxoriginals/' || game_code || '-thumb.jpg'
WHERE game_code = 'sweet_bonanza';
```

---

## 🔧 Common Tasks

### Add New Game
1. Copy game folder to `/var/www/html/backend.jackpotx.net/JxOriginalGames/`
2. Add to database:
```sql
INSERT INTO games (name, provider, game_code, vendor, category, rtp_percentage, volatility, min_bet, max_bet)
VALUES ('New Game', 'JxOriginals', 'new_game', 'Pragmatic', 'slots', 96.00, 'high', 0.20, 100.00);
```
3. Restart backend: `sudo -u ubuntu pm2 restart backend`

### Modify Game RTP
1. Edit game source files (varies by game architecture)
2. Update database: `UPDATE games SET rtp_percentage = X WHERE game_code = 'Y';`
3. Restart WebSocket server: `sudo -u ubuntu pm2 restart jxoriginals-pragmatic`

### Frontend Rebuild
```bash
cd /var/www/html/jackpotx.net
sudo -u ubuntu npm run build
sudo -u ubuntu pm2 restart frontend
```

---

## 🐛 Troubleshooting

### Problem: 502 Error on API
**Check:**
```bash
# Is backend running?
sudo -u ubuntu pm2 list | grep backend

# Check NGINX config
sudo nginx -t

# Check backend port
sudo netstat -tlnp | grep 3001
```
**Solution:** `sudo -u ubuntu pm2 restart backend`

---

### Problem: Game Not Launching
**Check:**
```bash
# WebSocket servers running?
sudo -u ubuntu pm2 list | grep jxoriginals

# Ports open?
sudo netstat -tlnp | grep -E "8443|8444"

# Firewall?
sudo ufw status | grep -E "8443|8444"
```
**Solution:** `sudo -u ubuntu pm2 restart jxoriginals-pragmatic jxoriginals-slots`

---

### Problem: Frontend Page 404
**Check:**
```bash
# Frontend running?
sudo -u ubuntu pm2 list | grep frontend

# Build exists?
ls -la /var/www/html/jackpotx.net/build/

# Route added?
grep "jx-originals" /var/www/html/jackpotx.net/src/App.js
```
**Solution:** Rebuild and restart frontend

---

### Problem: Images Not Loading
**Check:**
```bash
# Path in database
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db \
  -c "SELECT game_code, image_url, thumbnail_url FROM games WHERE provider = 'JxOriginals' LIMIT 3;"

# Files exist?
ls -la /var/www/html/backend.jackpotx.net/JxOriginalGames/SweetBonanza/
```
**Solution:** Create images (see JXORIGINALS_IMAGES_TODO.md) or fallback emoji will show

---

## 📈 Monitoring

### Performance Check
```bash
# Memory usage
free -h

# CPU usage
top -bn1 | grep "Cpu(s)"

# PM2 monitoring
sudo -u ubuntu pm2 monit

# Disk space
df -h /var/www/html
```

### API Response Time
```bash
# Test API speed
time curl -s https://backend.jackpotx.net/api/jxoriginals/games > /dev/null

# Expected: <100ms
```

### Database Performance
```bash
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db \
  -c "SELECT COUNT(*) FROM games WHERE provider = 'JxOriginals';"

# Should return: 16
```

---

## 🎮 Game List

### Pragmatic Games (4)
1. Sweet Bonanza (sweet_bonanza) - 96.50% RTP
2. Gates of Olympus (gates_olympus) - 96.50% RTP
3. Hercules Son of Zeus (hercules_zeus) - 96.48% RTP
4. Sugar Rush (sugar_rush) - 96.50% RTP

### ISoftBet Games (10)
5. Aztec Gold Megaways (aztec_gold_megaways) - 96.10% RTP
6. Fishing for Gold (fishing_gold) - 96.00% RTP
7. Ghosts n Gold (ghosts_gold) - 96.05% RTP
8. Hot Spin Deluxe (hot_spin_deluxe) - 95.98% RTP
9. Lost Boys Loot (lost_boys_loot) - 96.12% RTP
10. Racetrack Riches (racetrack_riches) - 96.08% RTP
11. Sheriff of Nottingham (sheriff_nottingham) - 96.15% RTP
12. Stacks O Gold (stacks_gold) - 96.10% RTP
13. The Golden City (golden_city) - 96.18% RTP ⭐
14. Wild Ape (wild_ape) - 96.05% RTP

### CryptoTech Games (2)
15. American Gigolo (american_gigolo) - 95.95% RTP
16. Bavarian Forest (bavarian_forest) - 96.00% RTP

---

## 🔐 Security

### NGINX Security
- ✅ Blocks .env, .git, .sql files
- ✅ Denies PTWebSocket directory access
- ✅ Rate limiting on API (20 req/s, burst 40)
- ✅ SSL/TLS encryption

### Backend Security
- ✅ JWT authentication for game launch
- ✅ Session token validation
- ✅ Input validation on all endpoints

### WebSocket Security
- ✅ WSS (encrypted WebSocket)
- ✅ Token-based auth
- ✅ CORS configured
- ✅ Rate limiting (100 req/min)

---

## 📚 Documentation

### Full Guides
- **JXORIGINALS_FINAL_REPORT.md** - Complete technical report
- **JXORIGINALS_SUCCESS.md** - Deployment status
- **JXORIGINALS_FRONTEND_COMPLETE.md** - Frontend guide
- **JXORIGINALS_IMAGES_TODO.md** - Image creation guide
- **JXORIGINALS_README.md** - Quick start
- **JXORIGINALS_DEPLOYMENT_GUIDE.md** - Step-by-step deployment

### Quick Commands
```bash
# View all docs
ls -la /var/www/html/backend.jackpotx.net/JXORIGINALS_*.md

# Read a doc
cat /var/www/html/backend.jackpotx.net/JXORIGINALS_README.md
```

---

## 🆘 Emergency Procedures

### Backend Down
```bash
# Check status
sudo -u ubuntu pm2 list

# View logs
sudo -u ubuntu pm2 logs backend --lines 100 --nostream

# Restart
sudo -u ubuntu pm2 restart backend

# If still down, restart from ecosystem
cd /var/www/html/backend.jackpotx.net
sudo -u ubuntu pm2 delete backend
sudo -u ubuntu pm2 start ecosystem.config.js
```

### WebSocket Down
```bash
# Restart all WebSocket servers
sudo -u ubuntu pm2 restart jxoriginals-pragmatic jxoriginals-slots

# If needed, start fresh
cd /var/www/html/backend.jackpotx.net/JxOriginalGames/PTWebSocket
sudo -u ubuntu pm2 delete jxoriginals-pragmatic jxoriginals-slots
sudo -u ubuntu pm2 start Server.js --name "jxoriginals-pragmatic"
sudo -u ubuntu pm2 start JxOriginals.js --name "jxoriginals-slots"
sudo -u ubuntu pm2 save
```

### NGINX Issues
```bash
# Test config
sudo nginx -t

# View errors
sudo tail -50 /var/log/nginx/error.log

# Restart NGINX
sudo systemctl restart nginx

# If config broken, restore backup
sudo cp /etc/nginx/sites-available/backend.jackpotx.net.backup \
       /etc/nginx/sites-enabled/backend.jackpotx.net
sudo nginx -t && sudo systemctl reload nginx
```

---

## ✅ Health Check Script

Create `/root/check_jxoriginals.sh`:
```bash
#!/bin/bash
echo "=== JX Originals Health Check ==="

# Check PM2
echo "PM2 Status:"
pm2 list | grep -E "backend|jxoriginals|frontend"

# Check API
echo -e "\nAPI Test:"
curl -s https://backend.jackpotx.net/api/jxoriginals/games | jq -r '.count'

# Check WebSocket ports
echo -e "\nWebSocket Ports:"
netstat -tlnp | grep -E "8443|8444"

# Check database
echo -e "\nDatabase Count:"
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db \
  -t -c "SELECT COUNT(*) FROM games WHERE provider = 'JxOriginals';"

echo -e "\n=== Health Check Complete ==="
```

Run: `sudo bash /root/check_jxoriginals.sh`

---

## 📞 Support

**For Issues:**
1. Check logs: `sudo -u ubuntu pm2 logs backend`
2. Verify services: `sudo -u ubuntu pm2 list`
3. Test API: `curl https://backend.jackpotx.net/api/jxoriginals/games`
4. Check documentation in `/var/www/html/backend.jackpotx.net/JXORIGINALS_*.md`

---

**Last Updated:** November 10, 2025
**Status:** ✅ PRODUCTION READY
**Version:** 1.0.0
