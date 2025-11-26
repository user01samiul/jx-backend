# Bonus System - User Frontend Integration Guide

## Overview

This guide provides complete integration instructions for implementing the bonus system in the **User Frontend** (Player-facing interface).

The bonus system implements a **dual-wallet architecture** where players have:
- **Main Wallet**: Real money (withdrawable)
- **Bonus Wallet**: Bonus money (requires wagering before withdrawal)

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Authentication](#authentication)
3. [Data Models](#data-models)
4. [User Flows](#user-flows)
5. [UI Components](#ui-components)
6. [Examples](#examples)

---

## API Endpoints

### Base URL
```
https://backend.jackpotx.net/api
```

All bonus endpoints require JWT authentication via Bearer token.

---

## 1. Get Combined Balance (Main + Bonus)

**Endpoint:** `GET /api/bonus/combined-balance`

**Description:** Get player's combined balance showing both main wallet and bonus wallet

**Request Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mainWallet": 1000.00,
    "bonusWallet": 500.00,
    "totalAvailable": 1500.00,
    "activeBonusCount": 2
  }
}
```

**UI Display:**
```
Total Balance: $1,500.00
├─ Main Wallet: $1,000.00 (withdrawable)
└─ Bonus Wallet: $500.00 (2 active bonuses)
```

---

## 2. Get My Bonus Wallet

**Endpoint:** `GET /api/bonus/wallet`

**Description:** Get detailed bonus wallet information

**Response:**
```json
{
  "success": true,
  "data": {
    "total_bonus_balance": 500.00,
    "locked_bonus_balance": 300.00,
    "playable_bonus_balance": 200.00,
    "total_bonus_received": 2000.00,
    "total_bonus_wagered": 5000.00,
    "total_bonus_released": 1200.00,
    "total_bonus_forfeited": 300.00,
    "active_bonus_count": 2,
    "currency": "USD"
  }
}
```

**Field Explanations:**
- `total_bonus_balance`: Total bonus money available
- `locked_bonus_balance`: Bonus money locked in active wagering
- `playable_bonus_balance`: Bonus money available for betting
- `total_bonus_received`: Lifetime bonuses received
- `total_bonus_wagered`: Lifetime wagered with bonus money
- `total_bonus_released`: Lifetime bonus money converted to real money
- `total_bonus_forfeited`: Lifetime bonuses lost (withdrawal, expiry)

---

## 3. Get My Active Bonuses

**Endpoint:** `GET /api/bonus/active`

**Description:** Get all currently active bonuses

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "bonus_plan_id": 5,
      "bonus_amount": 500.00,
      "remaining_bonus": 450.00,
      "wager_requirement_amount": 17500.00,
      "wager_progress_amount": 2500.00,
      "wager_percentage_complete": 14.29,
      "status": "wagering",
      "granted_at": "2025-01-15T10:00:00Z",
      "expires_at": "2025-02-14T10:00:00Z",
      "bonus_plan": {
        "name": "100% Welcome Bonus",
        "description": "Get 100% match on your first deposit",
        "wager_requirement_multiplier": 35
      }
    }
  ]
}
```

---

## 4. Get Wagering Progress

**Endpoint:** `GET /api/bonus/wagering-progress`

**Description:** Get detailed wagering progress for all active bonuses

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "bonus_instance_id": 123,
      "required_wager_amount": 17500.00,
      "current_wager_amount": 2500.00,
      "remaining_wager_amount": 15000.00,
      "completion_percentage": 14.29,
      "slots_contribution": 2000.00,
      "table_games_contribution": 500.00,
      "live_casino_contribution": 0.00,
      "other_games_contribution": 0.00,
      "total_bets_count": 50,
      "last_bet_at": "2025-01-20T14:30:00Z",
      "started_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**Game Contribution Percentages:**
- Slots: 100%
- Video Poker: 50%
- Table Games (Blackjack, Baccarat): 10%
- Live Casino: 10-20%
- Some games: 0% (excluded)

**Example:**
```
Bet $100 on Slots → $100 towards wagering (100%)
Bet $100 on Blackjack → $10 towards wagering (10%)
```

---

## 5. Get All My Bonuses (History)

**Endpoint:** `GET /api/bonus/my-bonuses`

**Query Parameters:**
- `status` (optional): `active`, `wagering`, `completed`, `expired`, `forfeited`, `cancelled`
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```
GET /api/bonus/my-bonuses?status=completed&limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "bonus_amount": 200.00,
      "status": "completed",
      "granted_at": "2025-01-01T10:00:00Z",
      "completed_at": "2025-01-10T15:30:00Z",
      "bonus_plan": {
        "name": "Reload Bonus 50%"
      }
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

---

## 6. Apply Bonus Code

**Endpoint:** `POST /api/bonus/apply-code`

**Description:** Redeem a promotional bonus code

**Request Body:**
```json
{
  "code": "WELCOME100"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Bonus code applied successfully",
  "data": {
    "id": 125,
    "bonus_amount": 100.00,
    "wager_requirement_amount": 3500.00,
    "expires_at": "2025-02-20T10:00:00Z"
  }
}
```

**Error Responses:**

```json
// Invalid code
{
  "success": false,
  "message": "Invalid bonus code"
}

// Code expired
{
  "success": false,
  "message": "Bonus code expired or not yet active"
}

// Usage limit reached
{
  "success": false,
  "message": "Bonus code usage limit reached"
}

// Not eligible
{
  "success": false,
  "message": "Player not eligible for this bonus"
}
```

---

## 7. Get Available Bonuses (Categorized)

**Endpoint:** `GET /api/bonus/available`

**Description:** Get list of available bonuses categorized by type (excludes promotional campaigns)

**IMPORTANT:** This endpoint returns ONLY bonus types (not promotions like tournaments, freebets, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "coded": [
      {
        "id": 5,
        "name": "Welcome Bonus 100%",
        "description": "Get 100% match on your first deposit up to $50,000",
        "image_url": "https://cdn.example.com/bonus-welcome.jpg",
        "trigger_type": "coded",
        "award_type": "percentage",
        "amount": 100.00,
        "wager_requirement_multiplier": 35,
        "expiry_days": 30,
        "start_date": "2025-01-01T00:00:00Z",
        "end_date": "2025-12-31T23:59:59Z",
        "bonus_code": "WELCOME100",
        "max_code_usage": 1000,
        "current_code_usage": 456
      }
    ],
    "deposit": [
      {
        "id": 1,
        "name": "100% First Deposit Bonus",
        "description": "Match bonus on your first deposit",
        "trigger_type": "deposit",
        "award_type": "percentage",
        "amount": 100.00,
        "min_deposit": 10.00,
        "max_deposit": 500.00,
        "wager_requirement_multiplier": 35,
        "expiry_days": 30
      }
    ],
    "loyalty": [
      {
        "id": 10,
        "name": "VIP Level 5 Reward",
        "description": "Exclusive bonus for VIP Level 5 members",
        "trigger_type": "loyalty",
        "award_type": "flat_amount",
        "amount": 1000.00,
        "vip_level_required": 5,
        "wager_requirement_multiplier": 20,
        "expiry_days": 30
      }
    ],
    "cashback": [
      {
        "id": 15,
        "name": "10% Weekly Cashback",
        "description": "Get 10% cashback on weekly losses",
        "trigger_type": "scheduled_cashback",
        "cashback_percentage": 10.00,
        "cashback_calculation_period": "weekly",
        "wager_requirement_multiplier": 1,
        "expiry_days": 7
      }
    ]
  }
}
```

**Response Structure:**
- `coded`: Bonuses that require a promotional code (user must apply manually)
- `deposit`: Bonuses auto-granted on deposit (informational for user)
- `loyalty`: VIP/loyalty bonuses (informational, auto-granted when criteria met)
- `cashback`: Cashback bonuses (informational, auto-calculated and granted)

**Currency:** All amounts are in **USD** (United States Dollar)

---

## 8. Get Bonus Transactions

**Endpoint:** `GET /api/bonus/transactions`

**Description:** Get bonus transaction history (audit trail)

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1001,
        "transaction_type": "granted",
        "amount": 500.00,
        "balance_before": 0.00,
        "balance_after": 500.00,
        "description": "Deposit bonus granted for deposit of 500",
        "created_at": "2025-01-15T10:00:00Z"
      },
      {
        "id": 1002,
        "transaction_type": "bet_placed",
        "amount": 50.00,
        "balance_before": 500.00,
        "balance_after": 450.00,
        "game_id": 123,
        "wager_contribution": 50.00,
        "description": "Bet placed with bonus wallet",
        "created_at": "2025-01-15T10:30:00Z"
      },
      {
        "id": 1003,
        "transaction_type": "bet_won",
        "amount": 100.00,
        "balance_before": 450.00,
        "balance_after": 550.00,
        "game_id": 123,
        "description": "Bet won - winnings added to bonus wallet",
        "created_at": "2025-01-15T10:31:00Z"
      }
    ],
    "total": 50
  },
  "pagination": {
    "total": 50,
    "limit": 50,
    "offset": 0
  }
}
```

**Transaction Types:**
- `granted`: Bonus granted
- `activated`: Bonus activated
- `bet_placed`: Bet placed with bonus
- `bet_won`: Bet won
- `bet_lost`: Bet lost
- `wager_contributed`: Contribution to wagering
- `released`: Money released to main wallet
- `forfeited`: Bonus forfeited
- `expired`: Bonus expired

---

## 9. Get My Bonus Statistics

**Endpoint:** `GET /api/bonus/stats`

**Description:** Get player's bonus statistics summary

**Response:**
```json
{
  "success": true,
  "data": {
    "total_bonuses_received": 5,
    "total_bonus_amount": 2500.00,
    "total_completed": 2,
    "total_forfeited": 1,
    "total_active": 2,
    "completion_rate": 40.00,
    "total_wagered": 15000.00,
    "total_released": 1200.00
  }
}
```

---

## Data Models

### Bonus Instance Status

```typescript
type BonusStatus =
  | 'pending'    // Just granted, not activated
  | 'active'     // Active, can be used
  | 'wagering'   // In wagering process
  | 'completed'  // Wagering completed, money released
  | 'expired'    // Expired before completion
  | 'forfeited'  // Lost (withdrawal, rule violation)
  | 'cancelled'; // Manually cancelled
```

### Bonus Status Flow

```
pending → active → wagering → completed ✓
                           ↓
                      expired/forfeited/cancelled ✗
```

---

## User Flows

### Flow 1: Applying a Bonus Code

```typescript
// Step 1: Show available bonuses
GET /api/bonus/available

// Step 2: Player enters code
POST /api/bonus/apply-code
{
  "code": "WELCOME100"
}

// Step 3: Show confirmation
"Bonus activated! $500 added to your bonus wallet.
 Complete 35x wagering ($17,500) to release funds."

// Step 4: Refresh balance
GET /api/bonus/combined-balance
```

**UI Mockup:**
```
┌─────────────────────────────────┐
│  Enter Bonus Code               │
│                                 │
│  Code: [WELCOME100    ] [Apply] │
│                                 │
│  ✓ Bonus activated!             │
│    $500 added to bonus wallet   │
│    Wager $17,500 to unlock      │
└─────────────────────────────────┘
```

---

### Flow 2: Viewing Active Bonuses

**Page Layout:**

```
┌─────────────────────────────────────────────┐
│  MY ACTIVE BONUSES                          │
├─────────────────────────────────────────────┤
│                                             │
│  🎁 100% Welcome Bonus                      │
│  ├─ Bonus: $500.00                          │
│  ├─ Remaining: $450.00                      │
│  ├─ Wagering Progress: 14.29% ($2,500/$17,500) │
│  ├─ Expires: Feb 14, 2025                   │
│  └─ [View Details]                          │
│                                             │
│  🎁 Reload Bonus 50%                        │
│  ├─ Bonus: $250.00                          │
│  ├─ Remaining: $250.00                      │
│  ├─ Wagering Progress: 0% ($0/$8,750)      │
│  ├─ Expires: Feb 20, 2025                   │
│  └─ [View Details]                          │
└─────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// Fetch active bonuses
const response = await fetch('/api/bonus/active', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: bonuses } = await response.json();

// Render bonuses
bonuses.forEach(bonus => {
  renderBonusCard({
    name: bonus.bonus_plan.name,
    amount: bonus.bonus_amount,
    remaining: bonus.remaining_bonus,
    progress: bonus.wager_percentage_complete,
    wagered: bonus.wager_progress_amount,
    required: bonus.wager_requirement_amount,
    expiresAt: bonus.expires_at
  });
});
```

---

### Flow 3: Wagering Progress Display

**Component:**

```html
<div class="wagering-progress">
  <div class="progress-header">
    <span>Wagering Progress</span>
    <span class="percentage">14.29%</span>
  </div>

  <div class="progress-bar">
    <div class="progress-fill" style="width: 14.29%"></div>
  </div>

  <div class="progress-details">
    <span>$2,500 / $17,500</span>
    <span>$15,000 remaining</span>
  </div>

  <div class="game-contributions">
    <h4>Contributions by Game Type</h4>
    <ul>
      <li>Slots: $2,000 (100% contribution)</li>
      <li>Table Games: $500 (10% contribution)</li>
      <li>Live Casino: $0 (10% contribution)</li>
    </ul>
  </div>
</div>
```

**Fetch Progress:**

```typescript
const response = await fetch('/api/bonus/wagering-progress', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data: progressList } = await response.json();

// Display each bonus's progress
progressList.forEach(progress => {
  updateProgressBar(
    progress.completion_percentage,
    progress.current_wager_amount,
    progress.required_wager_amount
  );
});
```

---

### Flow 4: Balance Display (Dual Wallet)

**Recommended UI:**

```
┌────────────────────────────┐
│  YOUR BALANCE              │
├────────────────────────────┤
│                            │
│  💰 Total: $1,500.00       │
│                            │
│  Main Wallet: $1,000.00    │
│  (Available for withdrawal)│
│                            │
│  Bonus Wallet: $500.00     │
│  (2 active bonuses)        │
│  [View Bonuses]            │
│                            │
│  ⓘ Main wallet is used     │
│     first for bets         │
└────────────────────────────┘
```

**Implementation:**

```typescript
async function loadBalance() {
  const response = await fetch('/api/bonus/combined-balance', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data } = await response.json();

  document.getElementById('total-balance').textContent =
    formatCurrency(data.totalAvailable);

  document.getElementById('main-wallet').textContent =
    formatCurrency(data.mainWallet);

  document.getElementById('bonus-wallet').textContent =
    formatCurrency(data.bonusWallet);

  document.getElementById('active-bonus-count').textContent =
    data.activeBonusCount;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}
```

---

## Important Rules to Display to Users

### 1. Betting Order
```
⚠️ Important: Main wallet is used first for bets.
Bonus wallet is only used when main wallet is empty.
```

### 2. Withdrawal Warning
```
⚠️ Warning: Requesting a withdrawal will forfeit all active bonuses!
Complete wagering requirements before withdrawing.
```

### 3. Wagering Requirements
```
ℹ️ Wagering Requirements:
- You must wager the bonus amount 35x to release funds
- Different games contribute differently:
  • Slots: 100%
  • Table Games: 10-20%
  • Some games don't contribute
- Check each bonus's requirements
```

### 4. Expiry Notice
```
⏰ Expiry: This bonus expires in 15 days
Complete wagering before expiry or lose the bonus.
```

---

## Real-Time Updates

### WebSocket Events (If Implemented)

```typescript
socket.on('bonus:granted', (data) => {
  showNotification(`New bonus: ${data.bonus_amount} USD`);
  refreshBalance();
  refreshActiveBonuses();
});

socket.on('bonus:wagering_updated', (data) => {
  updateWageringProgress(data.bonus_id, data.progress);
});

socket.on('bonus:completed', (data) => {
  showNotification(`Bonus completed! ${data.released_amount} USD released to main wallet`);
  refreshBalance();
  refreshActiveBonuses();
});

socket.on('bonus:expired', (data) => {
  showNotification(`Bonus expired: ${data.bonus_name}`);
  refreshBalance();
  refreshActiveBonuses();
});
```

### Polling Alternative

```typescript
// Poll for updates every 30 seconds
setInterval(async () => {
  await refreshBalance();
  await refreshActiveBonuses();
}, 30000);
```

---

## Error Handling

```typescript
async function applyBonusCode(code: string) {
  try {
    const response = await fetch('/api/bonus/apply-code', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const result = await response.json();

    if (!result.success) {
      // Show user-friendly error
      if (result.message.includes('expired')) {
        showError('This bonus code has expired');
      } else if (result.message.includes('limit')) {
        showError('This bonus code has reached its usage limit');
      } else if (result.message.includes('eligible')) {
        showError('You are not eligible for this bonus');
      } else if (result.message.includes('Invalid')) {
        showError('Invalid bonus code');
      } else {
        showError(result.message);
      }
      return;
    }

    // Success
    showSuccess(`Bonus activated! ${result.data.bonus_amount} USD added`);
    refreshBalance();
    refreshActiveBonuses();

  } catch (error) {
    showError('Failed to apply bonus code. Please try again.');
    console.error(error);
  }
}
```

---

## Complete Example: Bonus Page Component (React)

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';

interface ActiveBonus {
  id: number;
  bonus_plan: { name: string };
  bonus_amount: number;
  remaining_bonus: number;
  wager_percentage_complete: number;
  wager_progress_amount: number;
  wager_requirement_amount: number;
  expires_at: string;
}

export const BonusPage: React.FC = () => {
  const { token } = useAuth();
  const [activeBonuses, setActiveBonuses] = useState<ActiveBonus[]>([]);
  const [bonusCode, setBonusCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActiveBonuses();
  }, []);

  const loadActiveBonuses = async () => {
    const response = await fetch('/api/bonus/active', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const { data } = await response.json();
    setActiveBonuses(data);
  };

  const applyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/bonus/apply-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: bonusCode })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Bonus activated! $${result.data.bonus_amount} added`);
        setBonusCode('');
        loadActiveBonuses();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to apply code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bonus-page">
      <h1>My Bonuses</h1>

      {/* Apply Code Section */}
      <div className="apply-code-section">
        <h2>Apply Bonus Code</h2>
        <form onSubmit={applyCode}>
          <input
            type="text"
            value={bonusCode}
            onChange={(e) => setBonusCode(e.target.value.toUpperCase())}
            placeholder="Enter bonus code"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Applying...' : 'Apply'}
          </button>
        </form>
      </div>

      {/* Active Bonuses */}
      <div className="active-bonuses">
        <h2>Active Bonuses ({activeBonuses.length})</h2>
        {activeBonuses.map(bonus => (
          <div key={bonus.id} className="bonus-card">
            <h3>{bonus.bonus_plan.name}</h3>
            <p>Bonus: ${bonus.bonus_amount.toFixed(2)}</p>
            <p>Remaining: ${bonus.remaining_bonus.toFixed(2)}</p>

            <div className="progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${bonus.wager_percentage_complete}%` }}
                />
              </div>
              <span>
                {bonus.wager_percentage_complete.toFixed(2)}%
                (${bonus.wager_progress_amount} / ${bonus.wager_requirement_amount})
              </span>
            </div>

            <p>Expires: {new Date(bonus.expires_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Testing Checklist

- [ ] Can view combined balance (main + bonus)
- [ ] Can apply bonus code successfully
- [ ] Can view active bonuses
- [ ] Can view wagering progress
- [ ] Progress bar updates correctly
- [ ] Can view bonus transaction history
- [ ] Error handling for invalid codes
- [ ] Error handling for expired codes
- [ ] Balance updates in real-time
- [ ] Expiry dates display correctly
- [ ] Mobile responsive design

---

## Support

For technical issues or questions:
- Backend API: https://backend.jackpotx.net/api
- Documentation: Check this guide
- Database: PostgreSQL tables starting with `bonus_*`

**Note:** Deposit bonuses are granted automatically by the backend. This frontend integration focuses on player-facing features for viewing and managing bonuses.
