# Free Spins Campaigns System - Frontend Implementation Guide

**Last Updated:** 2025-11-28
**Status:** ✅ FIXED & TESTED
**Backend URL:** https://backend.jackpotx.net

---

## 🔧 What Was Fixed

### Critical Issues Resolved ✅

1. **Fixed Vendor Configuration**
   - ❌ **Before:** Used `100hp` vendor (NOT supported by Innova)
   - ✅ **After:** Changed to `pragmatic` vendor (SUPPORTED & TESTED)
   - **Files Updated:**
     - `src/services/ChallengesService.ts:428`
     - `src/services/LoyaltyService.ts:611`

2. **Fixed Game ID**
   - ❌ **Before:** Game ID `1073` (local database ID, incompatible)
   - ✅ **After:** Game ID `23000` (Innova's Pragmatic Play game ID)
   - **Verified:** Supports USD, EUR, TRY with bet limits $0.20-$100

3. **Verified Bet Amount**
   - ✅ $0.20 confirmed in Innova's allowed limits for game 23000

4. **End-to-End Testing**
   - ✅ Created test campaign successfully
   - ✅ Campaign appears in Innova's listing API
   - ✅ All parameters validated

---

## 🎯 Supported Vendors (IMPORTANT!)

**ONLY these 4 vendors support free spins campaigns:**

| Vendor | Status | Games Available | Notes |
|--------|--------|-----------------|-------|
| `pragmatic` | ✅ **ACTIVE** | 1037 games | **DEFAULT** - Use this for all auto-campaigns |
| `3oaks` | ✅ Supported | 84 games | Alternative option |
| `3oaksP` | ✅ Supported | Unknown | Alternative option |
| `amigogaming` | ✅ Supported | Unknown | Alternative option |
| `vimplay` | ❌ **NOT SUPPORTED** | N/A | Cannot use for campaigns |
| `100hp` | ❌ **NOT SUPPORTED** | N/A | Cannot use for campaigns |
| `evoplay` | ❌ **NOT SUPPORTED** | N/A | Cannot use for campaigns |

**⚠️ WARNING:** Creating campaigns with unsupported vendors will FAIL!

---

## 📱 ADMIN FRONTEND IMPLEMENTATION

### Base Configuration

```javascript
const API_BASE_URL = 'https://backend.jackpotx.net';
const adminToken = localStorage.getItem('adminAccessToken'); // Your JWT token

const headers = {
  'Authorization': `Bearer ${adminToken}`,
  'Content-Type': 'application/json'
};
```

---

## 📋 Admin API Endpoints Reference

### 1. Get Supported Vendors

**Endpoint:** `GET /api/campaigns/vendors`

**Request:**
```javascript
const fetchVendors = async () => {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/vendors`, {
    headers
  });
  return await response.json();
};
```

**Response:**
```json
{
  "success": true,
  "data": ["pragmatic", "3oaks", "3oaksP", "amigogaming"]
}
```

---

### 2. Get Game Limits for Selected Vendor

**Endpoint:** `GET /api/campaigns/game-limits`

**Purpose:** Get available games and allowed bet amounts for a vendor

**Request:**
```javascript
const fetchGameLimits = async (vendor, currency = 'USD') => {
  const params = new URLSearchParams({
    vendors: vendor,
    currencies: currency
  });

  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/game-limits?${params}`,
    { headers }
  );
  return await response.json();
};

// Example usage
const limits = await fetchGameLimits('pragmatic', 'USD');
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "currency_code": "USD",
      "game_id": 23000,
      "vendor": "pragmatic",
      "limits": [0.2, 0.4, 0.6, 0.8, 1, 2, 4, 6, 8, 10, 15, 20, 40, 60, 80, 100],
      "bet_factors": [20]
    },
    {
      "currency_code": "USD",
      "game_id": 23001,
      "vendor": "pragmatic",
      "limits": [0.2, 0.4, 1, 2, 4, 10, 20, 60, 100]
    }
  ]
}
```

**Important Notes:**
- `game_id` is **Innova's game ID**, NOT your database game ID
- `limits` array contains ONLY allowed bet amounts
- You must use one of these exact values for `total_bet`

---

### 3. Create New Campaign

**Endpoint:** `POST /api/campaigns`

**Request:**
```javascript
const createCampaign = async (campaignData) => {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: 'POST',
    headers,
    body: JSON.stringify(campaignData)
  });
  return await response.json();
};

// Example campaign data
const campaignData = {
  vendor: "pragmatic",
  campaign_code: "XMAS_2025_" + Date.now(), // Must be unique!
  currency_code: "USD",
  freespins_per_player: 25,
  begins_at: Math.floor(Date.now() / 1000) + 300, // Start in 5 minutes (Unix timestamp)
  expires_at: Math.floor(Date.now() / 1000) + 86400, // +24 hours
  games: [
    {
      game_id: 23000, // Innova's game ID from game-limits API
      total_bet: 0.20  // Must be from the limits array!
    }
  ],
  players: ["123", "456"] // Optional - User IDs from your database
};

const result = await createCampaign(campaignData);
```

**Validation Rules:**
- ✅ `vendor` must be one of: pragmatic, 3oaks, 3oaksP, amigogaming
- ✅ `campaign_code` must be globally unique (use timestamp)
- ✅ `begins_at` must be Unix timestamp in the FUTURE
- ✅ `expires_at` must be after `begins_at`
- ✅ `game_id` must be from `/game-limits` API response
- ✅ `total_bet` must be in the game's `limits` array
- ✅ `players` array can be empty or contain valid user IDs

**Response:**
```json
{
  "success": true,
  "message": "Campaign created successfully"
}
```

**Error Examples:**
```json
// Invalid vendor
{
  "success": false,
  "error": "Failed to create campaign: The vendors is invalid"
}

// Invalid bet amount
{
  "success": false,
  "error": "total_bet 0.25 is not in allowed limits"
}

// Date in the past
{
  "success": false,
  "error": "The begins_at must be a date after now"
}
```

---

### 4. List All Campaigns

**Endpoint:** `GET /api/campaigns`

**Request:**
```javascript
const listCampaigns = async (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.vendor) params.append('vendors', filters.vendor);
  if (filters.includeExpired) params.append('include_expired', 'true');
  if (filters.perPage) params.append('per_page', filters.perPage);

  const response = await fetch(
    `${API_BASE_URL}/api/campaigns?${params}`,
    { headers }
  );
  return await response.json();
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "data": [
      {
        "campaign_code": "XMAS_2025_1764291952648",
        "vendor": "pragmatic",
        "currency_code": "USD",
        "freespins_per_player": 25,
        "begins_at": "1764292012",
        "expires_at": "1764378352",
        "canceled": 0,
        "players": ["123", "456"],
        "games": ["23000"]
      }
    ],
    "first_page_url": "...",
    "next_page_url": "...",
    "prev_page_url": null
  }
}
```

---

### 5. Add Players to Campaign

**Endpoint:** `POST /api/campaigns/:campaignCode/players/add`

**Request:**
```javascript
const addPlayers = async (campaignCode, playerIds) => {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignCode}/players/add`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ players: playerIds })
    }
  );
  return await response.json();
};

// Example
await addPlayers('XMAS_2025_1764291952648', ['789', '101112']);
```

---

### 6. Remove Players from Campaign

**Endpoint:** `POST /api/campaigns/:campaignCode/players/remove`

**Request:**
```javascript
const removePlayers = async (campaignCode, playerIds) => {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignCode}/players/remove`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ players: playerIds })
    }
  );
  return await response.json();
};
```

---

### 7. Cancel Campaign

**Endpoint:** `POST /api/campaigns/:campaignCode/cancel`

**Request:**
```javascript
const cancelCampaign = async (campaignCode) => {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignCode}/cancel`,
    {
      method: 'POST',
      headers
    }
  );
  return await response.json();
};
```

---

### 8. Get Campaign Statistics

**Endpoint:** `GET /api/admin/free-spins-campaigns/stats`

**Request:**
```javascript
const getStats = async () => {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/free-spins-campaigns/stats`,
    { headers }
  );
  return await response.json();
};
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_campaigns": 150,
    "active_campaigns": 45,
    "completed_campaigns": 90,
    "pending_campaigns": 10,
    "expired_campaigns": 5,
    "total_spins_granted": 12500,
    "total_spins_used": 8750,
    "total_spins_remaining": 3750,
    "total_win_amount": 2450.50,
    "total_bet_used": 1750.00,
    "usage_percentage": "70.00"
  }
}
```

---

### 9. List All User Campaigns (Admin View)

**Endpoint:** `GET /api/admin/free-spins-campaigns`

**Request:**
```javascript
const getAllUserCampaigns = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.source) params.append('source', filters.source);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await fetch(
    `${API_BASE_URL}/api/admin/free-spins-campaigns?${params}`,
    { headers }
  );
  return await response.json();
};
```

**Filter Options:**
- `status`: pending, active, completed, expired, cancelled
- `source`: challenge, loyalty
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": 1,
      "user_id": 123,
      "username": "player123",
      "email": "player@example.com",
      "campaign_code": "CHALLENGE_5_USER_123_1735689600000",
      "source": "challenge",
      "vendor": "pragmatic",
      "game_id": 23000,
      "game_name": "Sweet Bonanza",
      "freespins_total": 10,
      "freespins_used": 3,
      "freespins_remaining": 7,
      "total_win_amount": 12.50,
      "status": "active",
      "expires_at": "2026-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

## 👤 USER FRONTEND IMPLEMENTATION

### Authentication

```javascript
const API_BASE_URL = 'https://backend.jackpotx.net';
const userToken = localStorage.getItem('userAccessToken');

const headers = {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
};
```

---

### 1. Get My Free Spins Campaigns

**Endpoint:** `GET /api/campaigns/user/:userId`

**Request:**
```javascript
const getMyFreeSpins = async (userId) => {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/user/${userId}`,
    { headers }
  );
  return await response.json();
};

// Example usage
const currentUserId = 123; // From logged-in user
const myCampaigns = await getMyFreeSpins(currentUserId);
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "campaign_code": "CHALLENGE_5_USER_123_1735689600000",
      "vendor_name": "pragmatic",
      "currency_code": "USD",
      "freespins_per_player": 10,
      "freespins_used": 3,
      "freespins_remaining": 7,
      "begins_at": "2025-12-31T00:00:00.000Z",
      "expires_at": "2026-01-01T00:00:00.000Z",
      "assigned_at": "2025-12-30T12:00:00.000Z"
    }
  ]
}
```

**Security Note:**
- Users can ONLY see their own campaigns
- Trying to access another user's ID returns `403 Forbidden`

---

## 🎨 React Components Examples

### Admin: Campaign Creation Form

```jsx
import React, { useState, useEffect } from 'react';

const CreateCampaignForm = () => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [gameLimits, setGameLimits] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    campaign_code: '',
    currency: 'USD',
    freespins: 10,
    start_date: '',
    end_date: '',
    bet_amount: 0,
    players: ''
  });

  // Step 1: Fetch vendors
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    const res = await fetch('/api/campaigns/vendors', { headers });
    const data = await res.json();
    if (data.success) {
      setVendors(data.data);
      setSelectedVendor('pragmatic'); // Set default to pragmatic
    }
  };

  // Step 2: Fetch game limits when vendor/currency changes
  useEffect(() => {
    if (selectedVendor) {
      fetchGameLimits();
    }
  }, [selectedVendor, formData.currency]);

  const fetchGameLimits = async () => {
    const params = new URLSearchParams({
      vendors: selectedVendor,
      currencies: formData.currency
    });

    const res = await fetch(`/api/campaigns/game-limits?${params}`, { headers });
    const data = await res.json();

    if (data.success) {
      setGameLimits(data.data);
      if (data.data.length > 0) {
        setSelectedGame(data.data[0]); // Auto-select first game
      }
    }
  };

  // Step 3: Submit campaign
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Generate unique campaign code
    const campaignCode = formData.campaign_code ||
      `${selectedVendor.toUpperCase()}_${Date.now()}`;

    const campaignData = {
      vendor: selectedVendor,
      campaign_code: campaignCode,
      currency_code: formData.currency,
      freespins_per_player: parseInt(formData.freespins),
      begins_at: Math.floor(new Date(formData.start_date).getTime() / 1000),
      expires_at: Math.floor(new Date(formData.end_date).getTime() / 1000),
      games: [{
        game_id: selectedGame.game_id,
        total_bet: parseFloat(formData.bet_amount)
      }],
      players: formData.players
        ? formData.players.split(',').map(p => p.trim())
        : []
    };

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers,
        body: JSON.stringify(campaignData)
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ Campaign created successfully!');
        // Reset form or redirect
        window.location.href = '/admin/campaigns';
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campaign-form">
      <h2>Create Free Spins Campaign</h2>

      <form onSubmit={handleSubmit}>
        {/* Vendor Selection */}
        <div className="form-group">
          <label>Vendor *</label>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            required
          >
            <option value="">Select Vendor</option>
            {vendors.map(vendor => (
              <option key={vendor} value={vendor}>
                {vendor.toUpperCase()}
                {vendor === 'pragmatic' && ' (Recommended)'}
              </option>
            ))}
          </select>
        </div>

        {/* Campaign Code */}
        <div className="form-group">
          <label>Campaign Code</label>
          <input
            type="text"
            value={formData.campaign_code}
            onChange={(e) => setFormData({...formData, campaign_code: e.target.value})}
            placeholder="Leave empty for auto-generation"
          />
          <small>Will auto-generate if left empty</small>
        </div>

        {/* Currency */}
        <div className="form-group">
          <label>Currency *</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({...formData, currency: e.target.value})}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="TRY">TRY</option>
          </select>
        </div>

        {/* Game Selection */}
        {gameLimits.length > 0 && (
          <div className="form-group">
            <label>Game *</label>
            <select
              value={selectedGame?.game_id || ''}
              onChange={(e) => {
                const game = gameLimits.find(g => g.game_id === parseInt(e.target.value));
                setSelectedGame(game);
                setFormData({...formData, bet_amount: game.limits[0]}); // Auto-select first limit
              }}
              required
            >
              {gameLimits.map(game => (
                <option key={game.game_id} value={game.game_id}>
                  Game ID: {game.game_id}
                </option>
              ))}
            </select>
            <small>Found {gameLimits.length} games for {selectedVendor}</small>
          </div>
        )}

        {/* Bet Amount */}
        {selectedGame && (
          <div className="form-group">
            <label>Bet Amount per Spin *</label>
            <select
              value={formData.bet_amount}
              onChange={(e) => setFormData({...formData, bet_amount: e.target.value})}
              required
            >
              {selectedGame.limits.map(limit => (
                <option key={limit} value={limit}>
                  {formData.currency} {limit}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Free Spins Count */}
        <div className="form-group">
          <label>Free Spins per Player *</label>
          <input
            type="number"
            value={formData.freespins}
            onChange={(e) => setFormData({...formData, freespins: e.target.value})}
            min="1"
            max="500"
            required
          />
        </div>

        {/* Date Range */}
        <div className="form-row">
          <div className="form-group">
            <label>Start Date & Time *</label>
            <input
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>

          <div className="form-group">
            <label>End Date & Time *</label>
            <input
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              min={formData.start_date}
              required
            />
          </div>
        </div>

        {/* Players (Optional) */}
        <div className="form-group">
          <label>Player IDs (Optional)</label>
          <textarea
            value={formData.players}
            onChange={(e) => setFormData({...formData, players: e.target.value})}
            placeholder="123, 456, 789"
            rows="3"
          />
          <small>Comma-separated user IDs. Leave empty to add players later.</small>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading || !selectedGame}>
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>

      <style jsx>{`
        .campaign-form {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        label {
          display: block;
          font-weight: bold;
          margin-bottom: 5px;
        }
        input, select, textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        small {
          color: #666;
          font-size: 12px;
        }
        button {
          background: #4CAF50;
          color: white;
          padding: 12px 30px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default CreateCampaignForm;
```

---

### User: Free Spins Widget

```jsx
import React, { useState, useEffect } from 'react';

const FreeSpinsWidget = ({ userId }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCampaigns, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`/api/campaigns/user/${userId}`, { headers });
      const data = await res.json();

      if (data.success) {
        // Filter only active, non-expired campaigns
        const active = data.data.filter(c =>
          c.freespins_remaining > 0 &&
          new Date(c.expires_at) > new Date()
        );
        setCampaigns(active);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNow = (campaign) => {
    // Your game launch logic here
    window.launchGame(campaign.game_id, {
      campaignCode: campaign.campaign_code
    });
  };

  if (loading) return <div>Loading...</div>;

  if (campaigns.length === 0) {
    return (
      <div className="empty-widget">
        <h3>🎰 No Free Spins Available</h3>
        <p>Complete challenges or redeem loyalty points to get free spins!</p>
      </div>
    );
  }

  const totalSpins = campaigns.reduce((sum, c) => sum + c.freespins_remaining, 0);

  return (
    <div className="free-spins-widget">
      <div className="widget-header">
        <h3>🎁 Your Free Spins</h3>
        <span className="total-badge">{totalSpins} Total</span>
      </div>

      {campaigns.map(campaign => (
        <div key={campaign.id} className="campaign-card">
          <div className="campaign-info">
            <div className="spins-count">
              <span className="count">{campaign.freespins_remaining}</span>
              <span className="label">Free Spins</span>
            </div>

            <div className="details">
              <p className="vendor">{campaign.vendor_name.toUpperCase()}</p>
              <p className="expires">
                Expires: {new Date(campaign.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="progress-bar">
            <div
              className="fill"
              style={{
                width: `${(campaign.freespins_used / campaign.freespins_per_player) * 100}%`
              }}
            />
          </div>

          <p className="progress-text">
            {campaign.freespins_used} / {campaign.freespins_per_player} used
          </p>

          <button onClick={() => handlePlayNow(campaign)}>
            Play Now
          </button>
        </div>
      ))}

      <style jsx>{`
        .free-spins-widget {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 12px;
          color: white;
        }
        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .total-badge {
          background: rgba(255,255,255,0.2);
          padding: 5px 15px;
          border-radius: 20px;
          font-weight: bold;
        }
        .campaign-card {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .campaign-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .spins-count {
          text-align: center;
        }
        .count {
          display: block;
          font-size: 36px;
          font-weight: bold;
        }
        .label {
          font-size: 12px;
        }
        .vendor {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .expires {
          font-size: 12px;
          opacity: 0.8;
        }
        .progress-bar {
          background: rgba(255,255,255,0.2);
          height: 6px;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 5px;
        }
        .fill {
          background: #4CAF50;
          height: 100%;
          transition: width 0.3s;
        }
        .progress-text {
          font-size: 12px;
          text-align: center;
          margin-bottom: 10px;
        }
        button {
          width: 100%;
          background: #4CAF50;
          color: white;
          padding: 12px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default FreeSpinsWidget;
```

---

## 🔄 Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN WORKFLOW                            │
└─────────────────────────────────────────────────────────────┘

1. Admin clicks "Create Campaign"
   ↓
2. Fetch vendors → GET /api/campaigns/vendors
   Response: ["pragmatic", "3oaks", "amigogaming"]
   ↓
3. Admin selects "pragmatic"
   ↓
4. Fetch game limits → GET /api/campaigns/game-limits?vendors=pragmatic&currencies=USD
   Response: [{game_id: 23000, limits: [0.2, 0.4, 0.6...]}]
   ↓
5. Admin fills form:
   - Game: 23000
   - Bet: $0.20
   - Spins: 25
   - Dates: 2025-12-25 to 2025-12-26
   - Players: 123, 456
   ↓
6. Submit → POST /api/campaigns
   ↓
7. Backend:
   - Validates data
   - Creates campaign in Innova API ✅
   - Saves to local database ✅
   ↓
8. Success! Players now have free spins

┌─────────────────────────────────────────────────────────────┐
│                    USER WORKFLOW                             │
└─────────────────────────────────────────────────────────────┘

1. User logs in
   ↓
2. Frontend fetches campaigns → GET /api/campaigns/user/123
   Response: [{campaign_code: "XMAS_2025", freespins_remaining: 25}]
   ↓
3. Display free spins badge: "🎁 25 Free Spins"
   ↓
4. User clicks "Play Now"
   ↓
5. Launch game with campaign context
   ↓
6. Innova handles free spins automatically
   ↓
7. Innova sends callbacks to update spin usage
   ↓
8. User sees updated count in real-time

┌─────────────────────────────────────────────────────────────┐
│              AUTOMATIC CAMPAIGN CREATION                     │
│               (Challenges & Loyalty)                         │
└─────────────────────────────────────────────────────────────┘

1. Player completes challenge
   ↓
2. ChallengesService.grantFreeSpinsCampaign()
   ↓
3. Auto-creates campaign:
   - vendor: "pragmatic" ✅ (FIXED!)
   - game_id: 23000 ✅ (FIXED!)
   - total_bet: 0.20 ✅
   ↓
4. Campaign appears in user's free spins widget
```

---

## ⚠️ Important Implementation Notes

### 1. Unix Timestamps (Critical!)

JavaScript `Date.now()` returns **milliseconds**, but API requires **seconds**:

```javascript
// ❌ WRONG
begins_at: Date.now() // 1764291952648 (milliseconds)

// ✅ CORRECT
begins_at: Math.floor(Date.now() / 1000) // 1764291952 (seconds)
```

### 2. Future Dates Required

Campaign must start in the future:

```javascript
// ❌ WRONG - starts now
begins_at: Math.floor(Date.now() / 1000)

// ✅ CORRECT - starts in 5 minutes
begins_at: Math.floor(Date.now() / 1000) + 300
```

### 3. Bet Amount Validation

Must use EXACT value from limits array:

```javascript
// From API: limits: [0.2, 0.4, 0.6, 0.8, 1]

// ❌ WRONG
total_bet: 0.25 // Not in array!

// ✅ CORRECT
total_bet: 0.20 // Exact match from array
```

### 4. Campaign Code Uniqueness

Always generate unique codes:

```javascript
// ✅ GOOD - Uses timestamp
campaign_code: "XMAS_2025_" + Date.now()

// ❌ BAD - Can cause duplicates
campaign_code: "XMAS_2025"
```

### 5. Error Handling

Always handle errors properly:

```javascript
try {
  const res = await fetch(url, options);
  const data = await res.json();

  if (!data.success) {
    // Show error to user
    alert(data.error);
    return;
  }

  // Process data.data
} catch (error) {
  console.error('Network error:', error);
  alert('Connection failed. Please try again.');
}
```

---

## 🧪 Testing Checklist

### Admin Frontend Tests

- [ ] Can fetch and display vendors list
- [ ] Can fetch game limits for selected vendor
- [ ] Form validation prevents invalid submissions
- [ ] Campaign creation succeeds with valid data
- [ ] Error messages display properly
- [ ] Can list campaigns with filters
- [ ] Can add/remove players from campaign
- [ ] Can cancel active campaigns
- [ ] Statistics dashboard shows correct data
- [ ] Pagination works correctly

### User Frontend Tests

- [ ] Free spins widget shows active campaigns
- [ ] Badge displays correct total count
- [ ] Countdown timer shows time until expiry
- [ ] Progress bars update correctly
- [ ] "Play Now" button launches game
- [ ] Empty state displays when no campaigns
- [ ] Real-time polling updates data
- [ ] Expired campaigns don't show

---

## 🚀 Production Deployment

### 1. Verify Backend is Running

```bash
# SSH to server
ssh root@backend.jackpotx.net

# Check PM2 status
pm2 status

# Restart if needed
pm2 restart backend

# Check logs
pm2 logs backend --lines 50
```

### 2. Test Endpoints

```bash
# Test vendor endpoint
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://backend.jackpotx.net/api/campaigns/vendors

# Should return:
# {"success":true,"data":["pragmatic","3oaks","3oaksP","amigogaming"]}
```

### 3. Monitor Logs

```bash
# Watch for campaign creation
pm2 logs backend | grep CHALLENGES
pm2 logs backend | grep LOYALTY
pm2 logs backend | grep INNOVA_CAMPAIGNS
```

---

## 📞 API Response Formats

All endpoints return this consistent format:

```javascript
// Success
{
  "success": true,
  "data": { ... } // or "message": "..."
}

// Error
{
  "success": false,
  "error": "Detailed error message"
}
```

**Frontend should always check `success` field first:**

```javascript
const response = await fetch(url, options);
const data = await response.json();

if (data.success) {
  // Handle success
  console.log('Data:', data.data);
} else {
  // Handle error
  console.error('Error:', data.error);
  alert(data.error);
}
```

---

## 🔐 Security Notes

1. **JWT Authentication Required**
   - All endpoints require valid JWT token
   - Token expires after 24 hours
   - Include in `Authorization` header

2. **User Isolation**
   - Users can only see their own campaigns
   - Attempting to access other user's data returns `403 Forbidden`

3. **Admin Authorization**
   - Campaign creation/management requires admin role
   - Regular users cannot create campaigns

4. **Input Validation**
   - All inputs validated on backend
   - Don't bypass frontend validation

---

## 📊 Database Schema Reference

### Table: `user_free_spins_campaigns`

```sql
CREATE TABLE user_free_spins_campaigns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  campaign_code VARCHAR(255) UNIQUE,
  source VARCHAR(50), -- 'challenge' or 'loyalty'
  source_id INTEGER,
  vendor VARCHAR(100),
  game_id INTEGER,
  currency_code VARCHAR(10),
  freespins_total INTEGER,
  freespins_used INTEGER DEFAULT 0,
  freespins_remaining INTEGER,
  total_bet_amount DECIMAL(10,2),
  total_win_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20), -- 'pending', 'active', 'completed', 'expired', 'cancelled'
  begins_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campaign Lifecycle:**
1. `pending` - Campaign created, not yet started
2. `active` - User has started using spins
3. `completed` - All spins used
4. `expired` - Time limit passed
5. `cancelled` - Manually cancelled by admin

---

## 🎯 Summary

### ✅ What's Fixed
- Vendor changed from `100hp` → `pragmatic` ✅
- Game ID changed from `1073` → `23000` ✅
- Bet amount verified: `$0.20` ✅
- Tested end-to-end successfully ✅

### ✅ What Works Now
- Campaign creation with Pragmatic Play
- Auto-campaigns from Challenges system
- Auto-campaigns from Loyalty system
- All admin management endpoints
- All user viewing endpoints

### ⚠️ What to Remember
- Only 4 vendors supported (pragmatic, 3oaks, 3oaksP, amigogaming)
- Vimplay NOT supported
- Use Innova's game IDs, not your database IDs
- Bet amounts must match exactly from limits array
- Timestamps must be in Unix seconds (not milliseconds)

---

## 📞 Support & Questions

If you encounter issues:

1. Check backend logs: `pm2 logs backend`
2. Verify vendor is supported
3. Confirm game ID is from `/game-limits` API
4. Check bet amount is in limits array
5. Ensure timestamps are Unix seconds

---

**Documentation Version:** 1.0
**Last Tested:** 2025-11-28
**Status:** ✅ Production Ready
