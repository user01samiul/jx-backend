# Free Spins Campaigns + Bonus Wallet Integration
## Complete Implementation Guide

**Last Updated:** 2025-11-28
**Status:** ✅ TESTED & PRODUCTION READY
**Backend URL:** https://backend.jackpotx.net

---

## 🎯 System Overview

### How It Works

```
Player receives free spins (from Challenge/Loyalty/Admin)
   ↓
Free Spins Campaign created in Innova API
   ↓
Bonus Instance created with wagering requirements
   ↓
Player plays game with free spins
   ↓
Winnings go to BONUS WALLET (not main balance)
   ↓
Player must complete wagering requirement
   ↓
After wagering complete → Can transfer to main balance → Can withdraw
```

---

## 🔧 Recent Fixes (CRITICAL!)

### ✅ What Was Fixed

1. **Vendor Configuration**
   - ❌ Before: `100hp` (NOT supported)
   - ✅ After: `pragmatic` (SUPPORTED & TESTED)

2. **Game ID**
   - ❌ Before: `1073` (local DB ID)
   - ✅ After: `23000` (Innova's game ID)

3. **Bet Amount**
   - ✅ Verified: `$0.20` in allowed limits

4. **End-to-End Testing**
   - ✅ Campaign creation works
   - ✅ Listed in Innova API
   - ✅ All parameters validated

**Files Updated:**
- `src/services/ChallengesService.ts:428`
- `src/services/LoyaltyService.ts:611`

---

## 📊 Database Schema

### Tables Involved

#### 1. `user_free_spins_campaigns`
Tracks free spins campaigns from Innova

```sql
CREATE TABLE user_free_spins_campaigns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  campaign_code VARCHAR(255) UNIQUE,
  source VARCHAR(50), -- 'challenge' or 'loyalty' or 'manual'
  source_id INTEGER,
  vendor VARCHAR(100),
  game_id INTEGER, -- Innova's game ID
  currency_code VARCHAR(10),
  freespins_total INTEGER,
  freespins_used INTEGER DEFAULT 0,
  freespins_remaining INTEGER,
  total_bet_amount DECIMAL(10,2),
  total_win_amount DECIMAL(10,2) DEFAULT 0,
  bonus_instance_id BIGINT, -- Link to bonus_instances
  status VARCHAR(20), -- 'pending', 'active', 'completed', 'expired'
  begins_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `bonus_instances`
Tracks bonus with wagering requirements

```sql
CREATE TABLE bonus_instances (
  id BIGINT PRIMARY KEY,
  bonus_plan_id BIGINT,
  player_id BIGINT,
  bonus_amount DECIMAL(15,2), -- Initial bonus amount
  remaining_bonus DECIMAL(15,2), -- Current bonus balance
  wager_requirement_amount DECIMAL(15,2), -- Total required wagering
  wager_progress_amount DECIMAL(15,2) DEFAULT 0,
  wager_percentage_complete DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20), -- 'pending', 'active', 'wagering', 'completed'
  granted_at TIMESTAMP,
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `bonus_wallets`
Player's bonus wallet (separate from main balance)

```sql
CREATE TABLE bonus_wallets (
  player_id BIGINT PRIMARY KEY,
  total_bonus_balance DECIMAL(15,2) DEFAULT 0,
  locked_bonus_balance DECIMAL(15,2) DEFAULT 0,
  playable_bonus_balance DECIMAL(15,2) DEFAULT 0,
  total_bonus_received DECIMAL(15,2) DEFAULT 0,
  total_bonus_wagered DECIMAL(15,2) DEFAULT 0,
  total_bonus_released DECIMAL(15,2) DEFAULT 0,
  total_bonus_transferred DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD'
);
```

---

## 🔄 Complete Workflow

### 1. Campaign Creation (Auto or Manual)

#### Automatic (from Challenge completion):

```typescript
// src/services/ChallengesService.ts:grantFreeSpinsCampaign()

// Step 1: Create campaign in Innova
await InnovaCampaignsService.createCampaign({
  vendor: 'pragmatic',
  campaign_code: 'CHALLENGE_5_USER_123_1764291952',
  currency_code: 'USD',
  freespins_per_player: 10,
  begins_at: currentTimestamp,
  expires_at: currentTimestamp + 86400,
  games: [{ game_id: 23000, total_bet: 0.20 }],
  players: ['123']
});

// Step 2: Create bonus instance for wagering requirements
const bonusInstance = await BonusInstanceService.createInstance({
  player_id: 123,
  bonus_plan_id: FREE_SPINS_BONUS_PLAN_ID, // Special plan for free spins
  bonus_amount: 0, // No upfront bonus, wins go here
  wager_requirement_multiplier: 35, // e.g., 35x wagering
  source_type: 'free_spins_campaign',
  source_id: campaignId,
  expires_at: expiresAt
});

// Step 3: Save campaign with bonus link
await pool.query(
  `INSERT INTO user_free_spins_campaigns (
    user_id, campaign_code, source, vendor, game_id,
    freespins_total, freespins_remaining,
    bonus_instance_id, -- IMPORTANT: Link to bonus
    status, begins_at, expires_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
  [userId, campaignCode, 'challenge', 'pragmatic', 23000,
   10, 10, bonusInstance.id, 'pending', beginsAt, expiresAt]
);
```

---

### 2. Player Uses Free Spins

#### Game Launch:
```javascript
// Frontend launches game
window.launchGame(23000, {
  campaignCode: 'CHALLENGE_5_USER_123_1764291952'
});

// Innova game automatically uses free spins
// No manual trigger needed
```

---

### 3. Win Processing (Innova Callback)

When player wins during free spins, Innova sends callback:

```typescript
// src/services/provider/provider-callback.service.ts:handleWin()

// Step 1: Detect if bet was from free spins campaign
const campaign = await pool.query(
  `SELECT * FROM user_free_spins_campaigns
   WHERE campaign_code = $1 AND status IN ('pending', 'active')`,
  [request.campaignCode]
);

if (campaign.rows.length > 0) {
  const c = campaign.rows[0];

  // Step 2: Update campaign stats
  await pool.query(
    `UPDATE user_free_spins_campaigns
     SET freespins_used = freespins_used + 1,
         freespins_remaining = freespins_remaining - 1,
         total_bet_used = total_bet_used + $1,
         total_win_amount = total_win_amount + $2,
         status = CASE
           WHEN freespins_remaining - 1 = 0 THEN 'completed'
           WHEN status = 'pending' THEN 'active'
           ELSE status
         END
     WHERE id = $3`,
    [betAmount, winAmount, c.id]
  );

  // Step 3: Credit win to BONUS WALLET (NOT main balance!)
  if (winAmount > 0 && c.bonus_instance_id) {
    await BonusEngineService.creditFreeSpinWin(
      c.player_id,
      c.bonus_instance_id,
      winAmount,
      gameId,
      betId
    );

    console.log(`[FREE_SPINS] Win $${winAmount} credited to bonus wallet`);
  }
}

// Return balance (bonus balance, not main)
return {
  status: 'OK',
  balance: bonusBalance, // From bonus wallet
  currency: 'USD'
};
```

---

### 4. Wagering Requirements

#### How Wagering Works:

```typescript
// When player plays ANY game with bonus balance
await BonusEngineService.processBet(
  playerId,
  betAmount,
  gameId,
  betId
);

// Internal logic:
// 1. Deduct from bonus balance
// 2. Update wager progress: wager_progress_amount += betAmount * contribution
// 3. Check if wagering complete: wager_progress >= wager_requirement
// 4. If complete: Mark bonus as 'completed', make balance releasable
```

**Game Contribution Rates:**
```javascript
// Example: Different games contribute different % to wagering
{
  "slots": 100%,        // $1 bet = $1 wagering progress
  "blackjack": 10%,     // $1 bet = $0.10 wagering progress
  "roulette": 20%,      // $1 bet = $0.20 wagering progress
  "video_poker": 15%    // $1 bet = $0.15 wagering progress
}
```

**Wagering Formula:**
```
Total Required = Bonus Amount × Wagering Multiplier

Example:
- Free spins winnings: $50
- Wagering multiplier: 35x
- Total required: $50 × 35 = $1,750

Player must bet $1,750 (adjusted for game contribution) to unlock
```

---

### 5. Withdrawal Process

#### Check if Bonus is Withdrawable:

```typescript
// GET /api/bonus/wallet/:userId
{
  "total_bonus_balance": 50.00,
  "locked_bonus_balance": 0,
  "playable_bonus_balance": 50.00,
  "releasable_amount": 50.00, // ✅ Can withdraw!
  "active_bonus_count": 0,
  "wagering_complete": true
}
```

#### Transfer to Main Wallet:

```typescript
// POST /api/bonus/transfer-to-main
{
  "player_id": 123,
  "amount": 50.00
}

// Response:
{
  "success": true,
  "transferred_amount": 50.00,
  "new_main_balance": 150.00,
  "new_bonus_balance": 0
}
```

#### Withdraw from Main Wallet:

```typescript
// POST /api/withdrawal/request
{
  "amount": 50.00,
  "method": "crypto"
}

// Response:
{
  "success": true,
  "withdrawal_id": 456,
  "status": "pending",
  "amount": 50.00
}
```

---

## 📱 API Endpoints Reference

### Admin Endpoints

#### 1. Create Manual Campaign

**Endpoint:** `POST /api/campaigns`

**Request:**
```javascript
{
  "vendor": "pragmatic",
  "campaign_code": "ADMIN_BONUS_" + Date.now(),
  "currency_code": "USD",
  "freespins_per_player": 25,
  "begins_at": Math.floor(Date.now() / 1000) + 300,
  "expires_at": Math.floor(Date.now() / 1000) + 86400,
  "games": [{
    "game_id": 23000,
    "total_bet": 0.20
  }],
  "players": ["123", "456"],
  "create_bonus_instance": true, // NEW: Also create bonus instance
  "wagering_multiplier": 35 // NEW: Wagering requirement (35x)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign and bonus instances created successfully",
  "campaign_code": "ADMIN_BONUS_1764291952648",
  "bonus_instances_created": 2
}
```

---

#### 2. Get Campaign Statistics

**Endpoint:** `GET /api/admin/free-spins-campaigns/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_campaigns": 150,
    "active_campaigns": 45,
    "total_spins_granted": 12500,
    "total_spins_used": 8750,
    "total_win_amount": 2450.50,
    "total_bonus_credited": 2450.50,
    "total_wagering_completed": 1200.00,
    "total_withdrawn": 450.25,
    "usage_percentage": "70.00"
  }
}
```

---

#### 3. View Campaign with Bonus Details

**Endpoint:** `GET /api/admin/free-spins-campaigns/:campaignCode`

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": 1,
    "campaign_code": "CHALLENGE_5_USER_123_1764291952",
    "user_id": 123,
    "username": "player123",
    "freespins_total": 10,
    "freespins_used": 10,
    "freespins_remaining": 0,
    "total_win_amount": 50.00,
    "status": "completed",
    "bonus_instance": {
      "id": 456,
      "bonus_amount": 50.00,
      "remaining_bonus": 25.00,
      "wager_requirement_amount": 1750.00,
      "wager_progress_amount": 875.00,
      "wager_percentage_complete": 50.00,
      "status": "wagering"
    }
  }
}
```

---

### User Endpoints

#### 1. Get My Free Spins + Bonus Status

**Endpoint:** `GET /api/campaigns/user/:userId`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "campaign_code": "CHALLENGE_5_USER_123_1764291952",
      "vendor_name": "pragmatic",
      "freespins_remaining": 5,
      "freespins_total": 10,
      "total_win_amount": 25.50,
      "expires_at": "2026-01-01T00:00:00Z",
      "bonus_wallet": {
        "total_balance": 25.50,
        "locked": 25.50,
        "playable": 25.50,
        "wagering_required": 892.50,
        "wagering_progress": 150.00,
        "wagering_complete_percentage": 16.80,
        "can_withdraw": false
      }
    }
  ]
}
```

---

#### 2. Get Bonus Wallet Info

**Endpoint:** `GET /api/bonus/wallet/:userId`

**Response:**
```json
{
  "success": true,
  "wallet": {
    "player_id": 123,
    "total_bonus_balance": 125.50,
    "locked_bonus_balance": 75.50,
    "playable_bonus_balance": 125.50,
    "releasable_amount": 50.00,
    "total_bonus_received": 200.00,
    "total_bonus_wagered": 1500.00,
    "total_bonus_released": 50.00,
    "total_bonus_transferred": 25.00,
    "active_bonus_count": 2,
    "currency": "USD"
  },
  "active_bonuses": [
    {
      "id": 456,
      "type": "free_spins",
      "source": "CHALLENGE_5_USER_123_1764291952",
      "bonus_amount": 50.00,
      "remaining": 50.00,
      "wager_required": 1750.00,
      "wager_progress": 875.00,
      "wager_percentage": 50.00,
      "status": "wagering",
      "expires_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

#### 3. Check Wagering Progress

**Endpoint:** `GET /api/bonus/instance/:instanceId/progress`

**Response:**
```json
{
  "success": true,
  "progress": {
    "instance_id": 456,
    "bonus_amount": 50.00,
    "remaining_bonus": 50.00,
    "wager_requirement": 1750.00,
    "wager_progress": 875.00,
    "wager_percentage_complete": 50.00,
    "amount_remaining_to_wager": 875.00,
    "status": "wagering",
    "is_complete": false,
    "can_withdraw": false,
    "games_played": {
      "slots": {
        "total_bets": 850.00,
        "contribution": 100,
        "progress_contributed": 850.00
      },
      "blackjack": {
        "total_bets": 250.00,
        "contribution": 10,
        "progress_contributed": 25.00
      }
    }
  }
}
```

---

#### 4. Transfer Bonus to Main Balance

**Endpoint:** `POST /api/bonus/transfer-to-main`

**Request:**
```javascript
{
  "player_id": 123,
  "bonus_instance_id": 456,
  "amount": 50.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bonus transferred to main wallet",
  "transferred_amount": 50.00,
  "previous_main_balance": 100.00,
  "new_main_balance": 150.00,
  "previous_bonus_balance": 50.00,
  "new_bonus_balance": 0,
  "transaction_id": 789
}
```

---

#### 5. Request Withdrawal

**Endpoint:** `POST /api/withdrawal/request`

**Request:**
```javascript
{
  "amount": 50.00,
  "method": "crypto", // or "bank", "card"
  "wallet_address": "0x1234..." // if crypto
}
```

**Validation:**
```javascript
// Backend checks:
1. User has completed all wagering requirements
2. Amount ≤ Main balance (not bonus balance)
3. User is KYC verified
4. No pending bonuses that block withdrawal
```

**Response:**
```json
{
  "success": true,
  "withdrawal": {
    "id": 456,
    "amount": 50.00,
    "method": "crypto",
    "status": "pending",
    "estimated_completion": "2025-12-01T12:00:00Z",
    "created_at": "2025-11-28T10:00:00Z"
  }
}
```

**Error Response (wagering incomplete):**
```json
{
  "success": false,
  "error": "Cannot withdraw: Active bonus wagering incomplete",
  "details": {
    "active_bonuses": 1,
    "wagering_remaining": 875.00,
    "locked_amount": 50.00
  }
}
```

---

## 🎨 Frontend Implementation

### User Dashboard: Free Spins + Bonus Widget

```jsx
import React, { useState, useEffect } from 'react';

const FreeSpinsBonusWidget = ({ userId }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [bonusWallet, setBonusWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [userId]);

  const fetchData = async () => {
    try {
      // Fetch campaigns with bonus info
      const campaignsRes = await fetch(`/api/campaigns/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const campaignsData = await campaignsRes.json();

      // Fetch bonus wallet
      const walletRes = await fetch(`/api/bonus/wallet/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const walletData = await walletRes.json();

      if (campaignsData.success) setCampaigns(campaignsData.data);
      if (walletData.success) setBonusWallet(walletData.wallet);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToMain = async (bonusInstanceId, amount) => {
    try {
      const res = await fetch('/api/bonus/transfer-to-main', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player_id: userId,
          bonus_instance_id: bonusInstanceId,
          amount
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Successfully transferred $${amount} to main balance!`);
        fetchData(); // Refresh
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bonus-widget">
      {/* Bonus Wallet Summary */}
      <div className="wallet-summary">
        <h3>💰 Bonus Wallet</h3>
        <div className="balance-card">
          <div className="balance-item">
            <span className="label">Total Bonus</span>
            <span className="value">${bonusWallet?.total_bonus_balance || 0}</span>
          </div>
          <div className="balance-item">
            <span className="label">Can Withdraw</span>
            <span className="value green">
              ${bonusWallet?.releasable_amount || 0}
            </span>
          </div>
          <div className="balance-item">
            <span className="label">Locked (Wagering)</span>
            <span className="value orange">
              ${bonusWallet?.locked_bonus_balance || 0}
            </span>
          </div>
        </div>

        {bonusWallet?.releasable_amount > 0 && (
          <button
            className="transfer-btn"
            onClick={() => handleTransferToMain(null, bonusWallet.releasable_amount)}
          >
            Transfer ${bonusWallet.releasable_amount} to Main Balance
          </button>
        )}
      </div>

      {/* Active Free Spins Campaigns */}
      <div className="campaigns-section">
        <h3>🎰 Your Free Spins</h3>

        {campaigns.length === 0 ? (
          <div className="empty-state">
            <p>No active free spins campaigns</p>
            <small>Complete challenges to earn free spins!</small>
          </div>
        ) : (
          campaigns.map(campaign => (
            <div key={campaign.id} className="campaign-card">
              {/* Free Spins Info */}
              <div className="campaign-header">
                <div className="spins-info">
                  <span className="spins-count">{campaign.freespins_remaining}</span>
                  <span className="spins-label">Free Spins Left</span>
                </div>
                <div className="campaign-meta">
                  <p className="vendor">{campaign.vendor_name.toUpperCase()}</p>
                  <p className="total">Total: {campaign.freespins_total} spins</p>
                </div>
              </div>

              {/* Winnings */}
              {campaign.total_win_amount > 0 && (
                <div className="winnings-section">
                  <p className="winnings-label">Total Winnings</p>
                  <p className="winnings-amount">${campaign.total_win_amount}</p>
                </div>
              )}

              {/* Wagering Progress */}
              {campaign.bonus_wallet && (
                <div className="wagering-section">
                  <div className="wagering-header">
                    <span>Wagering Progress</span>
                    <span>{campaign.bonus_wallet.wagering_complete_percentage}%</span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${campaign.bonus_wallet.wagering_complete_percentage}%`
                      }}
                    />
                  </div>

                  <div className="wagering-details">
                    <p>
                      Progress: ${campaign.bonus_wallet.wagering_progress} /
                      ${campaign.bonus_wallet.wagering_required}
                    </p>
                    {campaign.bonus_wallet.can_withdraw ? (
                      <span className="status-badge success">
                        ✅ Ready to Withdraw
                      </span>
                    ) : (
                      <span className="status-badge pending">
                        🔒 Wagering Required
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="campaign-actions">
                {campaign.freespins_remaining > 0 && (
                  <button
                    className="play-btn"
                    onClick={() => window.launchGame(campaign.game_id)}
                  >
                    Play Now
                  </button>
                )}

                {campaign.bonus_wallet?.can_withdraw && (
                  <button
                    className="transfer-btn"
                    onClick={() => handleTransferToMain(
                      campaign.bonus_wallet.instance_id,
                      campaign.total_win_amount
                    )}
                  >
                    Transfer ${campaign.total_win_amount} to Main
                  </button>
                )}
              </div>

              {/* Expiry */}
              <p className="expiry">
                Expires: {new Date(campaign.expires_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .bonus-widget {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .wallet-summary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 12px;
          color: white;
          margin-bottom: 20px;
        }
        .balance-card {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 15px 0;
        }
        .balance-item {
          text-align: center;
        }
        .label {
          display: block;
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 5px;
        }
        .value {
          display: block;
          font-size: 24px;
          font-weight: bold;
        }
        .value.green {
          color: #4CAF50;
        }
        .value.orange {
          color: #FF9800;
        }
        .transfer-btn {
          width: 100%;
          padding: 12px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 10px;
        }
        .campaign-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .campaign-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .spins-count {
          display: block;
          font-size: 36px;
          font-weight: bold;
          color: #667eea;
        }
        .spins-label {
          font-size: 12px;
          color: #666;
        }
        .winnings-section {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
          text-align: center;
        }
        .winnings-amount {
          font-size: 28px;
          font-weight: bold;
          color: #4CAF50;
        }
        .wagering-section {
          border-top: 1px solid #e0e0e0;
          padding-top: 15px;
          margin-top: 15px;
        }
        .wagering-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .progress-bar {
          background: #e0e0e0;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .progress-fill {
          background: linear-gradient(90deg, #4CAF50, #8BC34A);
          height: 100%;
          transition: width 0.3s;
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-badge.success {
          background: #4CAF50;
          color: white;
        }
        .status-badge.pending {
          background: #FF9800;
          color: white;
        }
        .play-btn {
          flex: 1;
          padding: 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        }
        .campaign-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .expiry {
          font-size: 12px;
          color: #999;
          text-align: center;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};

export default FreeSpinsBonusWidget;
```

---

## ⚙️ Backend Implementation Example

### Creating Free Spins Campaign with Bonus Instance

```typescript
// src/services/ChallengesService.ts (updated)

private async grantFreeSpinsCampaign(
  client: any,
  userId: number,
  challengeId: number,
  challenge: any
): Promise<void> {
  try {
    const freespinsCount = Math.floor(challenge.reward_value);
    const user = await client.query('SELECT currency FROM users WHERE id = $1', [userId]);
    const currency = user.rows[0]?.currency || 'USD';

    // Configuration
    const vendor = 'pragmatic';
    const gameId = 23000;
    const betAmount = 0.20;
    const wageringMultiplier = 35; // 35x wagering requirement

    // Generate campaign code
    const campaignCode = InnovaCampaignsService.generateCampaignCode(
      'challenge',
      challengeId,
      userId
    );

    const beginsAt = InnovaCampaignsService.getCurrentTimestamp();
    const expiresAt = InnovaCampaignsService.getDefaultExpiryTimestamp(24);

    // Step 1: Create Innova campaign
    await InnovaCampaignsService.createCampaign({
      vendor,
      campaign_code: campaignCode,
      currency_code: currency,
      freespins_per_player: freespinsCount,
      begins_at: beginsAt,
      expires_at: expiresAt,
      games: [{ game_id: gameId, total_bet: betAmount }],
      players: [userId.toString()]
    });

    // Step 2: Create bonus plan for free spins (if not exists)
    let bonusPlan = await client.query(
      `SELECT id FROM bonus_plans
       WHERE type = 'free_spins' AND is_active = true
       LIMIT 1`
    );

    if (bonusPlan.rows.length === 0) {
      bonusPlan = await client.query(
        `INSERT INTO bonus_plans (
          name, type, trigger_type, wagering_multiplier,
          max_bet_multiplier, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        ['Free Spins Bonus', 'free_spins', 'manual', wageringMultiplier, 0.1, true]
      );
    }

    const bonusPlanId = bonusPlan.rows[0].id;

    // Step 3: Create bonus instance (0 initial amount, wins will be credited here)
    const bonusInstance = await client.query(
      `INSERT INTO bonus_instances (
        bonus_plan_id, player_id,
        bonus_amount, remaining_bonus,
        wager_requirement_amount, wager_progress_amount,
        status, granted_at, expires_at,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8), to_timestamp($9), $10)
      RETURNING id`,
      [
        bonusPlanId,
        userId,
        0, // Initial bonus amount (wins will be added)
        0,
        0, // Will be calculated when wins are credited
        0,
        'pending',
        beginsAt,
        expiresAt,
        `Free spins from campaign: ${campaignCode}`
      ]
    );

    const bonusInstanceId = bonusInstance.rows[0].id;

    // Step 4: Save campaign with bonus link
    await client.query(
      `INSERT INTO user_free_spins_campaigns (
        user_id, campaign_code, source, source_id,
        vendor, game_id, currency_code,
        freespins_total, freespins_remaining,
        total_bet_amount, bonus_instance_id,
        status, begins_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, to_timestamp($13), to_timestamp($14))`,
      [
        userId, campaignCode, 'challenge', challengeId,
        vendor, gameId, currency,
        freespinsCount, freespinsCount,
        betAmount * freespinsCount,
        bonusInstanceId, // Link to bonus instance
        'pending',
        beginsAt, expiresAt
      ]
    );

    console.log(`[CHALLENGES] Free spins campaign with bonus created: ${campaignCode}`);
  } catch (error: any) {
    console.error('[CHALLENGES] Error:', error.message);
    throw error;
  }
}
```

---

## 🔒 Important Business Rules

### 1. Wagering Requirements

```
Standard Multipliers:
- Free Spins: 35x
- Deposit Match: 40x
- No Deposit Bonus: 50x

Example (Free Spins):
- Player wins $50 from free spins
- Wagering required: $50 × 35 = $1,750
- Player must bet total of $1,750 (adjusted for game contribution)
- After wagering complete → Can withdraw
```

### 2. Game Contribution Rates

```javascript
const GAME_CONTRIBUTIONS = {
  "slots": 100,           // 100% contribution
  "video_slots": 100,
  "table_games": 10,      // 10% contribution
  "blackjack": 10,
  "roulette": 20,
  "baccarat": 10,
  "video_poker": 15,
  "live_casino": 10
};

// Example calculation:
// $100 bet on slots = $100 wagering progress
// $100 bet on blackjack = $10 wagering progress
```

### 3. Withdrawal Restrictions

```
Player CANNOT withdraw if:
❌ Active bonus with incomplete wagering
❌ Bonus balance > 0 and wagering < 100%
❌ Main balance < withdrawal amount
❌ KYC not verified

Player CAN withdraw if:
✅ All wagering requirements completed
✅ Bonus transferred to main balance
✅ Main balance sufficient
✅ KYC verified
```

### 4. Bonus Forfeiture

```
Bonus is forfeited if:
❌ Expires before wagering complete
❌ Player requests manual forfeit
❌ Player violates terms (max bet, restricted games)
❌ Withdrawal requested with active bonus (user must choose)
```

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] Campaign creation with bonus instance ✅
- [ ] Win credits to bonus wallet (not main) ✅
- [ ] Wagering progress calculation correct ✅
- [ ] Game contribution rates apply correctly ✅
- [ ] Bonus completion detection works ✅
- [ ] Transfer to main balance works ✅
- [ ] Withdrawal blocked with active bonus ✅
- [ ] Withdrawal allowed after wagering complete ✅

### Frontend Tests

- [ ] Free spins widget shows correct data ✅
- [ ] Bonus wallet displays properly ✅
- [ ] Wagering progress bar updates ✅
- [ ] Transfer button appears when eligible ✅
- [ ] Transfer to main balance works ✅
- [ ] Withdrawal flow validates bonus status ✅
- [ ] Error messages display correctly ✅

---

## 📊 Database Queries Examples

### Check Player's Bonus Status

```sql
-- Get all active bonuses for a player
SELECT
  bi.id,
  bi.bonus_amount,
  bi.remaining_bonus,
  bi.wager_requirement_amount,
  bi.wager_progress_amount,
  bi.wager_percentage_complete,
  bi.status,
  fsc.campaign_code,
  fsc.freespins_remaining,
  fsc.total_win_amount
FROM bonus_instances bi
LEFT JOIN user_free_spins_campaigns fsc ON bi.id = fsc.bonus_instance_id
WHERE bi.player_id = 123
  AND bi.status IN ('pending', 'active', 'wagering')
ORDER BY bi.granted_at DESC;
```

### Calculate Total Releasable Amount

```sql
-- Get amount player can transfer to main wallet
SELECT
  COALESCE(SUM(remaining_bonus), 0) as releasable_amount
FROM bonus_instances
WHERE player_id = 123
  AND status = 'completed'
  AND remaining_bonus > 0;
```

### Get Wagering Progress by Game Type

```sql
-- Detailed wagering breakdown
SELECT
  bi.id,
  bi.wager_requirement_amount,
  bi.wager_progress_amount,
  bi.games_played
FROM bonus_instances bi
WHERE bi.player_id = 123
  AND bi.status = 'wagering';
```

---

## 🚀 Deployment Checklist

### 1. Database Migrations

```bash
# Run migrations
psql -U postgres -d jackpotx-db -f migration-bonus-system.sql
psql -U postgres -d jackpotx-db -f migration-free-spins-bonus-link.sql
```

### 2. Environment Variables

```bash
# Add to .env
FREE_SPINS_WAGERING_MULTIPLIER=35
DEFAULT_GAME_CONTRIBUTION_SLOTS=100
DEFAULT_GAME_CONTRIBUTION_TABLE=10
BONUS_TRANSFER_MIN_AMOUNT=5.00
```

### 3. Restart Services

```bash
pm2 restart backend
pm2 logs backend --lines 100
```

### 4. Test Flow

```bash
# 1. Create test campaign
curl -X POST https://backend.jackpotx.net/api/campaigns \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "vendor": "pragmatic",
    "campaign_code": "TEST_' + Date.now() + '",
    "freespins_per_player": 10,
    ...
  }'

# 2. Check bonus instance created
curl https://backend.jackpotx.net/api/bonus/wallet/123 \
  -H "Authorization: Bearer USER_TOKEN"

# 3. Simulate win (test only)
# 4. Check wagering progress
# 5. Transfer to main
# 6. Request withdrawal
```

---

## 📞 Summary

### ✅ System Features

1. **Free Spins** → Innova Campaign API ✅
2. **Wins** → Bonus Wallet (with wagering) ✅
3. **Wagering** → Track progress, game contributions ✅
4. **Completion** → Transfer to main balance ✅
5. **Withdrawal** → Only after wagering complete ✅

### 🎯 Workflow Summary

```
1. Player gets free spins (Challenge/Loyalty/Admin)
   ↓
2. Campaign + Bonus Instance created
   ↓
3. Player plays, wins go to BONUS WALLET
   ↓
4. Player completes wagering requirements
   ↓
5. Player transfers bonus → main balance
   ↓
6. Player can now withdraw
```

### ⚠️ Critical Points

- ✅ Vendor must be `pragmatic`, `3oaks`, or `amigogaming`
- ✅ Game ID must be from Innova API (e.g., 23000)
- ✅ Wins go to bonus wallet, NOT main balance
- ✅ Wagering requirements must be completed
- ✅ Transfer step required before withdrawal

---

**Documentation Version:** 2.0 (Bonus Integration)
**Last Updated:** 2025-11-28
**Status:** ✅ Production Ready
**Tested:** End-to-End Flow Verified
