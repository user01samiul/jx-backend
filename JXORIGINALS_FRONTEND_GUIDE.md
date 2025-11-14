# JxOriginals Frontend Integration Guide

## 📋 Overview

This guide explains how to integrate **JxOriginals games** into your frontend application. JxOriginals are internally hosted games with full source code control, separate from the Innova integration.

---

## 🎯 Features

- **18 Premium Games** - Full control over RTP, game logic, and features
- **3 Game Architectures** - Pragmatic, ISoftBet, and CryptoTech styles
- **Separate Category** - Dedicated "JX Originals" section in your frontend
- **WebSocket Support** - Real-time game communication
- **Full Customization** - Modify any aspect of the games

---

## 🔌 API Endpoints

### Base URL
```
https://backend.jackpotx.net/api/jxoriginals
```

### 1. **List All JxOriginals Games**
```typescript
GET /api/jxoriginals/games

Query Parameters:
- category?: string (e.g., "slots", "megaways")
- vendor?: string (e.g., "Pragmatic", "ISoftBet", "CryptoTech")
- limit?: number (default: 50)
- offset?: number (default: 0)

Response:
{
  "success": true,
  "provider": "JxOriginals",
  "count": 18,
  "games": [
    {
      "id": 101,
      "name": "Sweet Bonanza",
      "game_code": "sweet_bonanza",
      "category": "slots",
      "subcategory": "video_slots",
      "vendor": "Pragmatic",
      "image_url": "/cdn/games/jxoriginals/sweet-bonanza.jpg",
      "thumbnail_url": "/cdn/games/jxoriginals/sweet-bonanza-thumb.jpg",
      "description": "Popular cascade slot with tumbling reels...",
      "rtp_percentage": 96.50,
      "volatility": "high",
      "min_bet": 0.20,
      "max_bet": 100.00,
      "max_win": 21000.00,
      "is_featured": true,
      "is_new": true,
      "is_hot": true,
      "features": {
        "paylines": "cluster_pays",
        "max_multiplier": "100x",
        "free_spins": true,
        "bonus_buy": true
      }
    }
    // ... more games
  ]
}
```

### 2. **Get Featured Games**
```typescript
GET /api/jxoriginals/featured?limit=10

Response:
{
  "success": true,
  "provider": "JxOriginals",
  "count": 10,
  "games": [ /* featured games */ ]
}
```

### 3. **Get Categories**
```typescript
GET /api/jxoriginals/categories

Response:
{
  "success": true,
  "provider": "JxOriginals",
  "categories": [
    {
      "name": "slots",
      "game_count": 14,
      "games": [ /* games in this category */ ]
    },
    {
      "name": "megaways",
      "game_count": 1,
      "games": [ /* megaways games */ ]
    }
  ]
}
```

### 4. **Get Vendors**
```typescript
GET /api/jxoriginals/vendors

Response:
{
  "success": true,
  "provider": "JxOriginals",
  "vendors": [
    {
      "name": "Pragmatic",
      "game_count": 4,
      "categories": ["slots", "video_slots"]
    },
    {
      "name": "ISoftBet",
      "game_count": 10,
      "categories": ["slots", "video_slots", "megaways"]
    },
    {
      "name": "CryptoTech",
      "game_count": 2,
      "categories": ["slots", "video_slots"]
    }
  ]
}
```

### 5. **Search Games**
```typescript
GET /api/jxoriginals/search?q=sweet&limit=20

Response:
{
  "success": true,
  "provider": "JxOriginals",
  "query": "sweet",
  "total": 2,
  "count": 2,
  "games": [ /* matching games */ ]
}
```

### 6. **Launch Game** (Authenticated)
```typescript
POST /api/jxoriginals/launch/:gameId
Headers: Authorization: Bearer <user_token>

Request Body:
{
  "currency": "USD",
  "language": "en",
  "mode": "real"
}

Response:
{
  "success": true,
  "play_url": "https://backend.jackpotx.net/JxOriginalGames/SweetBonanza/index.html?token=abc123...",
  "game": {
    "id": 101,
    "name": "Sweet Bonanza",
    "game_code": "sweet_bonanza",
    "architecture": "pragmatic",
    "folder": "SweetBonanza"
  },
  "session": {
    "token": "abc123...",
    "session_id": "jxo_1_101_1699632000000",
    "balance": 150.50,
    "websocket_url": "wss://backend.jackpotx.net:8443/pragmatic"
  }
}
```

---

## 🎨 Frontend Implementation

### React/Next.js Example

#### 1. Create JxOriginals Page Component

```tsx
// pages/games/jxoriginals/index.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface JxOriginalsGame {
  id: number;
  name: string;
  game_code: string;
  image_url: string;
  thumbnail_url: string;
  description: string;
  vendor: string;
  rtp_percentage: number;
  volatility: string;
  is_featured: boolean;
  is_new: boolean;
  is_hot: boolean;
}

export default function JxOriginalsPage() {
  const [games, setGames] = useState<JxOriginalsGame[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch games on mount
  useEffect(() => {
    fetchGames();
    fetchCategories();
  }, [selectedCategory]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(
        `https://backend.jackpotx.net/api/jxoriginals/games?${params.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setGames(data.games);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('https://backend.jackpotx.net/api/jxoriginals/categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const launchGame = async (gameId: number) => {
    try {
      const userToken = localStorage.getItem('token'); // or from your auth context

      const response = await fetch(
        `https://backend.jackpotx.net/api/jxoriginals/launch/${gameId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            currency: 'USD',
            language: 'en',
            mode: 'real'
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        // Open game in new window or iframe
        window.open(data.play_url, '_blank', 'width=1280,height=720');

        // Or navigate to game page
        // router.push(`/games/play?url=${encodeURIComponent(data.play_url)}`);
      } else {
        alert(data.error || 'Failed to launch game');
      }
    } catch (error) {
      console.error('Failed to launch game:', error);
      alert('Failed to launch game. Please try again.');
    }
  };

  return (
    <div className="jxoriginals-page">
      {/* Header */}
      <div className="page-header">
        <h1>🎮 JX Originals</h1>
        <p>Exclusive games with full control and transparency</p>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        <button
          className={selectedCategory === 'all' ? 'active' : ''}
          onClick={() => setSelectedCategory('all')}
        >
          All Games ({games.length})
        </button>
        {categories.map(category => (
          <button
            key={category.name}
            className={selectedCategory === category.name ? 'active' : ''}
            onClick={() => setSelectedCategory(category.name)}
          >
            {category.name} ({category.game_count})
          </button>
        ))}
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="loading">Loading games...</div>
      ) : (
        <div className="games-grid">
          {games.map(game => (
            <div key={game.id} className="game-card">
              <div className="game-image">
                <img
                  src={game.thumbnail_url || game.image_url}
                  alt={game.name}
                />
                {game.is_new && <span className="badge new">NEW</span>}
                {game.is_hot && <span className="badge hot">HOT</span>}
                {game.is_featured && <span className="badge featured">FEATURED</span>}
              </div>

              <div className="game-info">
                <h3>{game.name}</h3>
                <p className="vendor">{game.vendor}</p>
                <p className="description">{game.description}</p>

                <div className="game-stats">
                  <span className="rtp">RTP: {game.rtp_percentage}%</span>
                  <span className="volatility">{game.volatility}</span>
                </div>

                <button
                  className="play-button"
                  onClick={() => launchGame(game.id)}
                >
                  Play Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 2. Add to Navigation Menu

```tsx
// components/Navigation.tsx

export default function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/games">All Games</Link>
      <Link href="/games/slots">Slots</Link>
      <Link href="/games/jxoriginals">🎮 JX Originals</Link> {/* NEW */}
      <Link href="/promotions">Promotions</Link>
      <Link href="/tournaments">Tournaments</Link>
    </nav>
  );
}
```

#### 3. Create Game Player Component

```tsx
// components/GamePlayer.tsx

interface GamePlayerProps {
  playUrl: string;
  gameName: string;
  onClose: () => void;
}

export default function GamePlayer({ playUrl, gameName, onClose }: GamePlayerProps) {
  return (
    <div className="game-player-modal">
      <div className="game-player-header">
        <h2>{gameName}</h2>
        <button onClick={onClose}>Close</button>
      </div>

      <iframe
        src={playUrl}
        className="game-iframe"
        title={gameName}
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
```

---

## 🎨 CSS Styling Example

```css
/* styles/jxoriginals.css */

.jxoriginals-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-size: 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

.category-filter {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  overflow-x: auto;
}

.category-filter button {
  padding: 0.75rem 1.5rem;
  border: 2px solid #ddd;
  background: white;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.category-filter button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

.game-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.game-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 12px rgba(0,0,0,0.15);
}

.game-image {
  position: relative;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  overflow: hidden;
}

.game-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.badge.new {
  background: #10b981;
  color: white;
}

.badge.hot {
  background: #ef4444;
  color: white;
}

.badge.featured {
  background: #f59e0b;
  color: white;
}

.game-info {
  padding: 1.5rem;
}

.game-info h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.vendor {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.description {
  font-size: 0.875rem;
  color: #4b5563;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.game-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.rtp {
  color: #10b981;
  font-weight: 600;
}

.volatility {
  color: #6b7280;
  text-transform: capitalize;
}

.play-button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
}

.play-button:hover {
  opacity: 0.9;
}

.game-player-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.95);
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.game-player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #1f2937;
  color: white;
}

.game-iframe {
  flex: 1;
  border: none;
  width: 100%;
}
```

---

## 📊 Analytics & Tracking

Track user interactions with JxOriginals games:

```typescript
// utils/analytics.ts

export const trackGameLaunch = (gameId: number, gameName: string) => {
  // Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'game_launch', {
      game_id: gameId,
      game_name: gameName,
      provider: 'JxOriginals'
    });
  }

  // Custom analytics
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'game_launch',
      properties: {
        game_id: gameId,
        game_name: gameName,
        provider: 'JxOriginals',
        timestamp: Date.now()
      }
    })
  });
};
```

---

## 🔐 Authentication

Ensure users are authenticated before launching games:

```typescript
const launchGame = async (gameId: number) => {
  // Check if user is logged in
  const user = getUserFromAuth(); // Your auth system

  if (!user) {
    // Redirect to login
    router.push('/login?redirect=/games/jxoriginals');
    return;
  }

  // Check if user has sufficient balance
  if (user.balance < MIN_BET) {
    alert('Insufficient balance. Please deposit to play.');
    router.push('/deposit');
    return;
  }

  // Launch game
  // ... launch code
};
```

---

## 📱 Mobile Responsiveness

```css
@media (max-width: 768px) {
  .games-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .category-filter {
    flex-wrap: wrap;
  }

  .game-info {
    padding: 1rem;
  }

  .description {
    -webkit-line-clamp: 1;
  }
}
```

---

## ✅ Testing Checklist

- [ ] Games load correctly from API
- [ ] Category filtering works
- [ ] Search functionality works
- [ ] Game launch opens in new window/iframe
- [ ] Authentication check before launch
- [ ] Balance check before launch
- [ ] Mobile responsive design
- [ ] Loading states display correctly
- [ ] Error messages display correctly
- [ ] Analytics tracking works
- [ ] Games display with correct badges (NEW, HOT, FEATURED)
- [ ] WebSocket connection established for games

---

## 🚀 Deployment

1. Run the SQL migration to add games:
```bash
psql -h localhost -U postgres -d jackpotx-db -f migrations/20241110_add_jxoriginals_games.sql
```

2. Deploy frontend changes

3. Test all endpoints

4. Monitor game launches in logs

---

## 📞 Support

For issues or questions:
- Backend API: Check `/var/www/html/backend.jackpotx.net/src/services/provider/jxoriginals-provider.service.ts`
- Game files: `/var/www/html/backend.jackpotx.net/JxOriginalGames/`
- Logs: `pm2 logs backend`

---

**Happy Gaming! 🎮**
