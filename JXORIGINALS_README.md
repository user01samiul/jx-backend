# 🎮 JxOriginals - Internal Casino Games Platform

## Quick Start Guide

### 1. Deploy Backend (One Command!)

```bash
cd /var/www/html/backend.jackpotx.net
./deploy_jxoriginals.sh
```

This script will automatically:
- ✅ Run database migration (add 18 games)
- ✅ Install dependencies
- ✅ Build TypeScript
- ✅ Start WebSocket servers
- ✅ Restart backend
- ✅ Verify deployment

---

### 2. Configure NGINX (One Time Setup)

```bash
# Edit NGINX config
sudo nano /etc/nginx/sites-available/backend.jackpotx.net

# Add the contents from nginx_jxoriginals.conf
# (Copy-paste the configuration snippet)

# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

---

### 3. Test the Integration

```bash
# Test API
curl https://backend.jackpotx.net/api/jxoriginals/games | jq

# Expected output:
{
  "success": true,
  "provider": "JxOriginals",
  "count": 18,
  "games": [...]
}
```

---

## 📁 Documentation Files

| File | Description |
|------|-------------|
| **JXORIGINALS_INTEGRATION_SUMMARY.md** | Quick reference and overview |
| **JXORIGINALS_FRONTEND_GUIDE.md** | Complete frontend integration with React examples |
| **JXORIGINALS_DEPLOYMENT_GUIDE.md** | Detailed step-by-step deployment guide |
| **JXORIGINALS_README.md** | This file - quick start guide |

---

## 🎯 API Endpoints

```bash
# List all games
GET /api/jxoriginals/games

# Get categories
GET /api/jxoriginals/categories

# Get featured games
GET /api/jxoriginals/featured

# Search games
GET /api/jxoriginals/search?q=sweet

# Launch game (authenticated)
POST /api/jxoriginals/launch/:gameId
Headers: Authorization: Bearer <token>
Body: { "currency": "USD", "language": "en", "mode": "real" }
```

---

## 🎲 The 18 Games

### Pragmatic-Style (4)
1. Sweet Bonanza - RTP 96.50%
2. Gates of Olympus - RTP 96.50%
3. Hercules Son of Zeus - RTP 96.48%
4. Sugar Rush - RTP 96.50%

### ISoftBet (10)
5. Aztec Gold Megaways - RTP 96.10%
6. Fishing for Gold - RTP 96.00%
7. Ghosts n Gold - RTP 96.05%
8. Hot Spin Deluxe - RTP 95.98%
9. Lost Boys Loot - RTP 96.12%
10. Racetrack Riches - RTP 96.08%
11. Sheriff of Nottingham - RTP 96.15%
12. Stacks O Gold - RTP 96.10%
13. The Golden City - RTP 96.18%
14. Wild Ape - RTP 96.05%

### CryptoTech (2)
15. American Gigolo - RTP 95.95%
16. Bavarian Forest - RTP 96.00%

---

## 🔧 Customization

### Change Game RTP

```bash
# Edit game settings
nano /var/www/html/backend.jackpotx.net/JxOriginalGames/SweetBonanza/SlotSettings.php

# Find and modify:
$this->rtp = 96.50;  // Change to desired RTP
```

### Modify Game Configuration

```bash
# Edit init.php for each game
nano /var/www/html/backend.jackpotx.net/JxOriginalGames/SweetBonanza/init.php

# Adjust min/max bets, features, paylines, etc.
```

---

## 📊 Monitoring

```bash
# Check all services
pm2 list

# View backend logs
pm2 logs backend

# View WebSocket logs
pm2 logs jxoriginals-pragmatic
pm2 logs jxoriginals-slots
pm2 logs jxoriginals-arcade

# NGINX logs
sudo tail -f /var/log/nginx/backend.jackpotx.net-access.log
sudo tail -f /var/log/nginx/backend.jackpotx.net-error.log
```

---

## 🐛 Troubleshooting

### Games don't show in API
```bash
# Re-run migration
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db \
  -f migrations/20241110_add_jxoriginals_games.sql
```

### WebSocket not connecting
```bash
# Restart WebSocket servers
pm2 restart jxoriginals-pragmatic jxoriginals-slots jxoriginals-arcade

# Check firewall
sudo ufw allow 8443/tcp
```

### Backend not responding
```bash
# Restart backend
pm2 restart backend

# Check logs
pm2 logs backend --lines 100
```

---

## 🎨 Frontend Integration

### Quick Example (React)

```tsx
import { useState, useEffect } from 'react';

function JxOriginalsPage() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetch('https://backend.jackpotx.net/api/jxoriginals/games')
      .then(res => res.json())
      .then(data => setGames(data.games));
  }, []);

  const launchGame = async (gameId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(
      `https://backend.jackpotx.net/api/jxoriginals/launch/${gameId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currency: 'USD', mode: 'real' })
      }
    );
    const data = await res.json();
    window.open(data.play_url, '_blank');
  };

  return (
    <div>
      <h1>🎮 JX Originals</h1>
      <div className="games-grid">
        {games.map(game => (
          <div key={game.id} className="game-card">
            <img src={game.thumbnail_url} alt={game.name} />
            <h3>{game.name}</h3>
            <p>RTP: {game.rtp_percentage}%</p>
            <button onClick={() => launchGame(game.id)}>
              Play Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Full example:** See `JXORIGINALS_FRONTEND_GUIDE.md`

---

## ✅ Deployment Checklist

- [ ] Run `./deploy_jxoriginals.sh`
- [ ] Configure NGINX (add nginx_jxoriginals.conf)
- [ ] Open firewall port 8443
- [ ] Test API endpoints
- [ ] Verify WebSocket connection
- [ ] Test game launch
- [ ] Integrate frontend
- [ ] Monitor logs for errors
- [ ] Test with real players

---

## 🚀 Production Ready Features

✅ **Dual Provider System** - Innova + JxOriginals
✅ **Smart Routing** - Auto-detects game provider
✅ **Full RTP Control** - Modify in source code
✅ **WebSocket Support** - Real-time game communication
✅ **Session Management** - Secure token-based auth
✅ **Balance Tracking** - Category-based balances
✅ **Transaction Logging** - Complete audit trail
✅ **Rate Limiting** - Abuse protection
✅ **SSL/TLS** - Secure connections
✅ **Monitoring** - PM2 + NGINX logs

---

## 📞 Support

- **Documentation:** Check the 4 guide files
- **Logs:** `pm2 logs backend`
- **Database:** `PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db`
- **Game Files:** `/var/www/html/backend.jackpotx.net/JxOriginalGames/`

---

## 🎉 Success Criteria

Your integration is successful when:

✅ `curl https://backend.jackpotx.net/api/jxoriginals/games` returns 18 games
✅ `pm2 list` shows all servers online
✅ WebSocket connects to `wss://backend.jackpotx.net:8443`
✅ Games launch and show balance
✅ Bets and wins process correctly
✅ No errors in PM2 logs

---

**Happy Gaming! 🎮🚀**

---

## Version History

- **v1.0.0** (2024-11-10) - Initial release
  - 18 games added
  - Full API implementation
  - WebSocket integration
  - Complete documentation
