# Bonus System - Admin Frontend Integration Guide

## Overview

This guide provides complete integration instructions for implementing the bonus system in the **Admin Frontend** (Management panel).

Admins can:
- Create and manage bonus plans
- Grant manual bonuses to players
- Monitor active bonuses and statistics
- Configure game wagering contributions
- View detailed bonus reports

---

## 🔀 Important: Bonus System vs Promotions

### **System Separation (Updated Nov 2025)**

The bonus system is **separated from the promotions system**:

**What This Means for Admins:**

✅ **You Can Create:**
- All trigger types in `bonus_plans` table
- Both bonus types AND promotional types

⚠️ **But Be Aware:**
- **Bonus Types** (appear in user FE):
  - `deposit` - Auto-granted on deposit
  - `coded` - User applies promotional code
  - `manual` - Admin manually grants
  - `loyalty` - VIP tier rewards
  - `instant_cashback` / `scheduled_cashback` - Cashback bonuses

- **Promotional Types** (do NOT appear in user bonus system):
  - `platform_bonus`, `product_bonus`, `freebet`, `betslip_based`, `external_api`, `tournament_win`
  - These require a separate promotions system (not implemented yet)

**Currency:** All amounts are in **USD** (United States Dollar)

**Best Practice:**
- Use bonus types for player rewards with wagering requirements
- Save promotional types for future promotions system implementation
- Add tooltips/warnings in UI when admin selects non-bonus trigger types

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Authentication](#authentication)
3. [Bonus Plan Management](#bonus-plan-management)
4. [Player Bonus Management](#player-bonus-management)
5. [Statistics & Reports](#statistics--reports)
6. [Game Configuration](#game-configuration)
7. [UI Examples](#ui-examples)

---

## API Endpoints

### Base URL
```
https://backend.jackpotx.net/api
```

All admin bonus endpoints require:
- JWT authentication via Bearer token
- Admin or Manager role

---

## Authentication

All requests must include:

```
Authorization: Bearer {admin_jwt_token}
```

**Role Requirements:**
- `Admin`: Full access
- `Manager`: Full access
- `Support`: Read-only access (some endpoints)

---

## Bonus Plan Management

### 1. Create Bonus Plan

**Endpoint:** `POST /api/admin/bonus/plans`

**Description:** Create a new bonus plan template

**Request Body:**
```json
{
  "name": "100% Welcome Bonus",
  "brand_id": 1,
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "start_time": null,
  "end_time": null,
  "expiry_days": 30,

  "trigger_type": "deposit",
  "min_deposit": 1000.00,
  "max_deposit": 50000.00,
  "payment_method_ids": [1, 2, 3],

  "award_type": "percentage",
  "amount": 100.00,
  "currency": "USD",

  "wager_requirement_multiplier": 35,
  "wager_requirement_type": "bonus",
  "wager_requirement_action": "release",
  "is_incremental": false,

  "game_type_id": null,
  "description": "Get 100% match on your first deposit up to $50,000. Wager 35x to release funds.",
  "image_url": "https://cdn.example.com/bonus-welcome.jpg",

  "is_playable": true,
  "playable_bonus_qualifies": false,
  "release_playable_winnings": false,
  "cancel_on_withdrawal": true,

  "max_trigger_all": 1000,
  "max_trigger_per_player": 1,
  "min_bonus_threshold": 100.00,
  "bonus_max_release": 50000.00,

  "recurrence_type": "non_recurring",
  "allow_sportsbook": false,
  "allow_poker": false,
  "additional_award": false,

  "bonus_code": null,
  "max_code_usage": null,

  "loyalty_points_required": null,
  "vip_level_required": null,

  "cashback_percentage": null,
  "cashback_calculation_period": null,

  "status": "active"
}
```

**Field Descriptions:**

**Basic Info:**
- `name`: Bonus plan name (required)
- `brand_id`: Brand ID (default: 1)
- `start_date`: When bonus becomes available (required)
- `end_date`: When bonus stops being available (required)
- `start_time`: Optional daily start time (HH:MM:SS)
- `end_time`: Optional daily end time (HH:MM:SS)
- `expiry_days`: Days player has to use bonus after grant (required)

**Trigger Type:**
- `deposit`: Triggered on deposit
- `coded`: Requires bonus code
- `coupon`: Coupon-based
- `manual`: Manual grant by admin
- `loyalty`: Triggered by loyalty points/VIP level
- `instant_cashback`: Instant cashback on losses
- `scheduled_cashback`: Periodic cashback (daily/weekly/monthly)
- `platform_bonus`: Platform-wide bonus
- `product_bonus`: Product-specific
- `freebet`: Free bet
- `betslip_based`: Based on betslip
- `external_api`: External API trigger
- `tournament_win`: Tournament winner bonus

**Deposit Configuration (for deposit bonuses):**
- `min_deposit`: Minimum deposit to qualify
- `max_deposit`: Maximum deposit for bonus calculation
- `payment_method_ids`: Accepted payment method IDs (JSON array)

**Award Configuration:**
- `award_type`: `flat_amount` or `percentage`
- `amount`: Fixed amount (e.g., 100) or percentage (e.g., 100 for 100%)
- `currency`: Currency code (default: USD)

**Wagering Requirements:**
- `wager_requirement_multiplier`: Multiplier (e.g., 35 = 35x)
- `wager_requirement_type`: `bonus`, `bonus_plus_deposit`, or `deposit`
- `wager_requirement_action`: `release` or `forfeit`
- `is_incremental`: Incremental wagering (default: false)

**Game Restrictions:**
- `game_type_id`: Restrict to specific game type (null = all games)
- `description`: Bonus description text
- `image_url`: Bonus image URL

**Flags:**
- `is_playable`: Bonus money can be used for bets (default: true)
- `playable_bonus_qualifies`: **DANGEROUS!** Bonus bets count towards wagering (default: false)
- `release_playable_winnings`: Release winnings immediately (default: false)
- `cancel_on_withdrawal`: Cancel bonus on withdrawal attempt (default: true)

**Limits:**
- `max_trigger_all`: Total number of times bonus can be granted (null = unlimited)
- `max_trigger_per_player`: Times per player (default: 1)
- `min_bonus_threshold`: Minimum bonus amount to grant
- `bonus_max_release`: Maximum amount that can be released

**Settings:**
- `recurrence_type`: `non_recurring`, `daily`, `weekly`, `monthly`
- `allow_sportsbook`: Allow in sportsbook (default: false)
- `allow_poker`: Allow in poker (default: false)
- `additional_award`: Additional award flag (default: false)

**For Coded Bonuses:**
- `bonus_code`: Bonus code (e.g., "WELCOME100")
- `max_code_usage`: Max times code can be used (null = unlimited)

**For Loyalty Bonuses:**
- `loyalty_points_required`: Required loyalty points
- `vip_level_required`: Required VIP level

**For Cashback Bonuses:**
- `cashback_percentage`: Cashback percentage (e.g., 10 for 10%)
- `cashback_calculation_period`: `daily`, `weekly`, or `monthly`

**Status:**
- `status`: `active`, `inactive`, or `expired`

**Success Response:**
```json
{
  "success": true,
  "message": "Bonus plan created successfully",
  "data": {
    "id": 15,
    "name": "100% Welcome Bonus",
    "trigger_type": "deposit",
    "amount": 100.00,
    "status": "active",
    "created_at": "2025-01-25T10:00:00Z"
  }
}
```

---

### 2. Get All Bonus Plans

**Endpoint:** `GET /api/admin/bonus/plans`

**Query Parameters:**
- `status`: Filter by status (`active`, `inactive`, `expired`)
- `trigger_type`: Filter by trigger type
- `brand_id`: Filter by brand
- `limit`: Results per page (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)

**Example Request:**
```
GET /api/admin/bonus/plans?status=active&trigger_type=deposit&limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "name": "100% Welcome Bonus",
      "trigger_type": "deposit",
      "award_type": "percentage",
      "amount": 100.00,
      "wager_requirement_multiplier": 35,
      "status": "active",
      "created_at": "2025-01-25T10:00:00Z",
      "start_date": "2025-01-01T00:00:00Z",
      "end_date": "2025-12-31T23:59:59Z"
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

### 3. Get Single Bonus Plan

**Endpoint:** `GET /api/admin/bonus/plans/{id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "100% Welcome Bonus",
    "brand_id": 1,
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-12-31T23:59:59Z",
    "expiry_days": 30,
    "trigger_type": "deposit",
    "min_deposit": 1000.00,
    "max_deposit": 50000.00,
    "award_type": "percentage",
    "amount": 100.00,
    "wager_requirement_multiplier": 35,
    "status": "active",
    "created_at": "2025-01-25T10:00:00Z"
  }
}
```

---

### 4. Update Bonus Plan

**Endpoint:** `PUT /api/admin/bonus/plans/{id}`

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Welcome Bonus",
  "amount": 150.00,
  "status": "inactive"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bonus plan updated successfully",
  "data": {
    "id": 15,
    "name": "Updated Welcome Bonus",
    "amount": 150.00
  }
}
```

---

### 5. Delete Bonus Plan

**Endpoint:** `DELETE /api/admin/bonus/plans/{id}`

**Response:**
```json
{
  "success": true,
  "message": "Bonus plan deleted successfully"
}
```

**Note:** Deleting a plan does not affect existing bonus instances. Active bonuses will continue until completion/expiry.

---

## Player Bonus Management

### 1. Grant Manual Bonus

**Endpoint:** `POST /api/admin/bonus/grant-manual`

**Description:** Manually grant a bonus to a specific player

**Request Body:**
```json
{
  "player_id": 123,
  "bonus_plan_id": 15,
  "custom_amount": 500.00,
  "notes": "VIP customer compensation for technical issue"
}
```

**Field Descriptions:**
- `player_id`: Target player's user ID (required)
- `bonus_plan_id`: Bonus plan to use as template (required)
- `custom_amount`: Override bonus amount (optional, uses plan amount if null)
- `notes`: Admin notes explaining why bonus was granted (required)

**Success Response:**
```json
{
  "success": true,
  "message": "Manual bonus granted successfully",
  "data": {
    "id": 456,
    "player_id": 123,
    "bonus_amount": 500.00,
    "wager_requirement_amount": 17500.00,
    "status": "active",
    "granted_at": "2025-01-25T14:30:00Z",
    "expires_at": "2025-02-24T14:30:00Z",
    "granted_by": 1,
    "notes": "VIP customer compensation for technical issue"
  }
}
```

---

### 2. Get Player Bonuses (Admin View)

**Endpoint:** `GET /api/admin/bonus/player/{playerId}/bonuses`

**Description:** View all bonuses for a specific player

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "bonus_plan": {
        "id": 15,
        "name": "100% Welcome Bonus"
      },
      "bonus_amount": 500.00,
      "remaining_bonus": 450.00,
      "wager_requirement_amount": 17500.00,
      "wager_progress_amount": 2500.00,
      "wager_percentage_complete": 14.29,
      "status": "wagering",
      "granted_at": "2025-01-15T10:00:00Z",
      "expires_at": "2025-02-14T10:00:00Z",
      "granted_by": 1,
      "notes": "Automatic deposit bonus"
    }
  ]
}
```

---

### 3. Forfeit Bonus

**Endpoint:** `POST /api/admin/bonus/instances/{id}/forfeit`

**Description:** Manually forfeit a player's active bonus

**Request Body:**
```json
{
  "reason": "Player violated bonus terms - multi-accounting detected"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Bonus forfeited successfully"
}
```

**Note:** This removes the bonus from the player's wallet and marks it as forfeited. Create an audit trail entry.

---

## Statistics & Reports

### 1. Get Bonus System Statistics

**Endpoint:** `GET /api/admin/bonus/statistics`

**Description:** Get overall bonus system statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActiveBonuses": 156,
    "totalPlayersWithBonus": 98,
    "totalBonusValue": 125000.00,
    "totalWageringProgress": 350000.00,
    "completionRate": 35.50
  }
}
```

**Field Descriptions:**
- `totalActiveBonuses`: Number of currently active bonus instances
- `totalPlayersWithBonus`: Number of players with active bonuses
- `totalBonusValue`: Total value of all active bonuses (USD)
- `totalWageringProgress`: Total amount wagered across all bonuses (USD)
- `completionRate`: Percentage of bonuses that get completed (vs forfeited/expired)

---

## Game Configuration

### 1. Set Game Wagering Contribution

**Endpoint:** `POST /api/admin/bonus/game-contribution`

**Description:** Configure wagering contribution percentage for a specific game

**Request Body:**
```json
{
  "game_id": 123,
  "contribution_percentage": 100.00,
  "is_restricted": false
}
```

**Field Descriptions:**
- `game_id`: Game ID (required)
- `contribution_percentage`: Percentage (0-100) that bets contribute to wagering (required)
  - 100 = Full contribution
  - 50 = Half contribution
  - 0 = No contribution
- `is_restricted`: If true, game cannot be played with bonus money (optional, default: false)

**Example Configurations:**
```javascript
// Slots - Full contribution
{ game_id: 123, contribution_percentage: 100.00 }

// Blackjack - 10% contribution
{ game_id: 456, contribution_percentage: 10.00 }

// Progressive Jackpot - Excluded
{ game_id: 789, contribution_percentage: 0.00, is_restricted: true }
```

**Success Response:**
```json
{
  "success": true,
  "message": "Game contribution updated"
}
```

---

### 2. Get Game Wagering Contribution

**Endpoint:** `GET /api/admin/bonus/game-contribution/{gameId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 45,
    "game_id": 123,
    "game_name": "Book of Ra Deluxe",
    "game_category": "slots",
    "provider": "Novomatic",
    "wagering_contribution_percentage": 100.00,
    "is_restricted": false
  }
}
```

---

## UI Examples

### 1. Bonus Plans List Page

**Page Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  BONUS PLANS                          [+ Create New]    │
├─────────────────────────────────────────────────────────┤
│  Filters:                                               │
│  Status: [All ▼] Type: [All ▼] [Search...]             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ID  │ Name              │ Type    │ Amount │ Status    │
│  ─────────────────────────────────────────────────────  │
│  15  │ 100% Welcome      │ Deposit │ 100%   │ ● Active  │
│      │ Bonus             │         │        │ [Edit][❌]│
│  ─────────────────────────────────────────────────────  │
│  16  │ Reload 50%        │ Deposit │ 50%    │ ● Active  │
│      │                   │         │        │ [Edit][❌]│
│  ─────────────────────────────────────────────────────  │
│  17  │ FREE100 Code      │ Coded   │ $100   │ ○ Inactive│
│      │                   │         │        │ [Edit][❌]│
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Showing 1-10 of 25                    [Previous][Next] │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Create/Edit Bonus Plan Form

**Form Sections:**

```
┌─────────────────────────────────────────────────┐
│  CREATE BONUS PLAN                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  BASIC INFORMATION                              │
│  Name: [______________________________]         │
│  Start Date: [___________] End Date: [________] │
│  Expiry Days: [___] days after grant            │
│  Description: [___________________________]     │
│                                                 │
│  TRIGGER & TYPE                                 │
│  Trigger Type: [Deposit ▼]                      │
│  Award Type: [Percentage ▼]                     │
│  Amount: [____] (% or fixed amount)             │
│                                                 │
│  DEPOSIT REQUIREMENTS (if deposit trigger)      │
│  Min Deposit: [____] Max Deposit: [____]        │
│  Payment Methods: [☑ Card ☑ Bank ☐ Crypto]     │
│                                                 │
│  WAGERING REQUIREMENTS                          │
│  Multiplier: [__]x                              │
│  Type: [Bonus Only ▼]                           │
│  Action: [Release ▼]                            │
│                                                 │
│  LIMITS & RESTRICTIONS                          │
│  Max Triggers (Total): [____]                   │
│  Max Per Player: [__]                           │
│  Min Bonus Threshold: [____]                    │
│  Max Release: [____]                            │
│                                                 │
│  FLAGS                                          │
│  ☑ Cancel on Withdrawal                         │
│  ☐ Bonus Bets Count Towards Wagering (DANGER!) │
│                                                 │
│  FOR CODED BONUSES                              │
│  Bonus Code: [________]                         │
│  Max Code Usage: [____]                         │
│                                                 │
│  [Cancel]                   [Create Bonus Plan] │
└─────────────────────────────────────────────────┘
```

---

### 3. Bonus Statistics Dashboard

**Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  BONUS SYSTEM STATISTICS                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Active       │ │ Players      │ │ Total Value  │   │
│  │ Bonuses      │ │ with Bonus   │ │              │   │
│  │              │ │              │ │              │   │
│  │    156       │ │     98       │ │  $125,000    │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Wagering     │ │ Completion   │ │              │   │
│  │ Progress     │ │ Rate         │ │              │   │
│  │              │ │              │ │              │   │
│  │  $350,000    │ │   35.5%      │ │              │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                         │
│  RECENT BONUS ACTIVITY                                  │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Today: 15 bonuses granted, 3 completed, 1 forfeited│ │
│  │ This Week: 89 bonuses granted, 23 completed        │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### 4. Player Detail - Bonuses Tab

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  PLAYER: johndoe (ID: 123)                              │
│  [Profile] [Bets] [Transactions] [BONUSES]              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  BONUS WALLET                                           │
│  Total: $500.00 | Playable: $200.00 | Locked: $300.00  │
│                                                         │
│  ACTIVE BONUSES (2)              [+ Grant Manual Bonus] │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 100% Welcome Bonus                    [Forfeit ❌]│ │
│  │ Bonus: $500 | Remaining: $450                     │ │
│  │ Wagering: 14.29% ($2,500 / $17,500)              │ │
│  │ Expires: Feb 14, 2025                             │ │
│  │ Status: Wagering                                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  BONUS HISTORY (5 total)                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Reload 50% - Completed - $200 released Jan 10     │ │
│  │ Cashback 10% - Completed - $50 released Jan 5     │ │
│  │ Welcome Bonus - Forfeited - Withdrew funds Jan 1  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### 5. Grant Manual Bonus Modal

```
┌─────────────────────────────────────┐
│  GRANT MANUAL BONUS                 │
│  Player: johndoe (ID: 123)          │
├─────────────────────────────────────┤
│                                     │
│  Select Bonus Plan:                 │
│  [Welcome 100% ▼]                   │
│                                     │
│  Custom Amount (Optional):          │
│  [500.00____]                       │
│                                     │
│  Reason (Required):                 │
│  [VIP customer compensation_______] │
│  [for technical issue on Jan 20___] │
│                                     │
│  Preview:                           │
│  Bonus Amount: $500                 │
│  Wagering Required: $17,500 (35x)   │
│  Expires: 30 days from grant        │
│                                     │
│  [Cancel]          [Grant Bonus]    │
└─────────────────────────────────────┘
```

---

### 6. Game Contributions Management

```
┌─────────────────────────────────────────────────────────┐
│  GAME WAGERING CONTRIBUTIONS                            │
├─────────────────────────────────────────────────────────┤
│  Category Defaults:                                     │
│  Slots: 100% | Table Games: 10% | Live Casino: 15%     │
│                                                         │
│  [Bulk Set by Category]                                 │
│                                                         │
│  INDIVIDUAL GAME SETTINGS                   [Search...] │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Game Name        │ Category │ Contrib │ Restricted │ │
│  │──────────────────────────────────────────────────│ │
│  │ Book of Ra      │ Slots    │ 100%    │ ☐ [Edit]  │ │
│  │ Blackjack Gold  │ Table    │ 10%     │ ☐ [Edit]  │ │
│  │ Mega Jackpot    │ Slots    │ 0%      │ ☑ [Edit]  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Showing 1-20 of 500                  [Previous] [Next] │
└─────────────────────────────────────────────────────────┘
```

---

## Complete Example: Create Bonus Plan (React)

```typescript
import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';

interface BonusPlanForm {
  name: string;
  start_date: string;
  end_date: string;
  expiry_days: number;
  trigger_type: string;
  award_type: string;
  amount: number;
  wager_requirement_multiplier: number;
  min_deposit?: number;
  max_deposit?: number;
  description?: string;
  status: string;
}

export const CreateBonusPlan: React.FC = () => {
  const { token } = useAuth();
  const [form, setForm] = useState<BonusPlanForm>({
    name: '',
    start_date: '',
    end_date: '',
    expiry_days: 30,
    trigger_type: 'deposit',
    award_type: 'percentage',
    amount: 100,
    wager_requirement_multiplier: 35,
    status: 'active'
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/bonus/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const result = await response.json();

      if (result.success) {
        alert('Bonus plan created successfully!');
        // Redirect to plans list
        window.location.href = '/admin/bonuses';
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to create bonus plan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-bonus-plan">
      <h1>Create Bonus Plan</h1>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <section>
          <h2>Basic Information</h2>

          <label>
            Name:
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label>
            Start Date:
            <input
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
          </label>

          <label>
            End Date:
            <input
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              required
            />
          </label>

          <label>
            Expiry Days:
            <input
              type="number"
              value={form.expiry_days}
              onChange={(e) => setForm({ ...form, expiry_days: parseInt(e.target.value) })}
              min="1"
              max="365"
              required
            />
          </label>
        </section>

        {/* Trigger & Award */}
        <section>
          <h2>Trigger & Award</h2>

          <label>
            Trigger Type:
            <select
              value={form.trigger_type}
              onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
            >
              <option value="deposit">Deposit</option>
              <option value="coded">Coded</option>
              <option value="manual">Manual</option>
              <option value="loyalty">Loyalty</option>
              <option value="instant_cashback">Instant Cashback</option>
            </select>
          </label>

          <label>
            Award Type:
            <select
              value={form.award_type}
              onChange={(e) => setForm({ ...form, award_type: e.target.value })}
            >
              <option value="percentage">Percentage</option>
              <option value="flat_amount">Flat Amount</option>
            </select>
          </label>

          <label>
            Amount ({form.award_type === 'percentage' ? '%' : 'USD'}):
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })}
              min="0"
              step="0.01"
              required
            />
          </label>
        </section>

        {/* Deposit Requirements */}
        {form.trigger_type === 'deposit' && (
          <section>
            <h2>Deposit Requirements</h2>

            <label>
              Min Deposit:
              <input
                type="number"
                value={form.min_deposit || ''}
                onChange={(e) => setForm({ ...form, min_deposit: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
            </label>

            <label>
              Max Deposit:
              <input
                type="number"
                value={form.max_deposit || ''}
                onChange={(e) => setForm({ ...form, max_deposit: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
            </label>
          </section>
        )}

        {/* Wagering Requirements */}
        <section>
          <h2>Wagering Requirements</h2>

          <label>
            Wagering Multiplier (e.g., 35 for 35x):
            <input
              type="number"
              value={form.wager_requirement_multiplier}
              onChange={(e) => setForm({ ...form, wager_requirement_multiplier: parseFloat(e.target.value) })}
              min="0"
              max="100"
              step="0.01"
              required
            />
          </label>
        </section>

        {/* Description */}
        <section>
          <label>
            Description:
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </label>
        </section>

        {/* Status */}
        <section>
          <label>
            Status:
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </section>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Bonus Plan'}
        </button>
      </form>
    </div>
  );
};
```

---

## Testing Checklist

Admin Panel:
- [ ] Can create bonus plan with all trigger types
- [ ] Can edit existing bonus plan
- [ ] Can delete bonus plan
- [ ] Can view all bonus plans with filters
- [ ] Can grant manual bonus to player
- [ ] Can view player's bonus history
- [ ] Can forfeit active bonus
- [ ] Can view system statistics
- [ ] Can set game wagering contributions
- [ ] Form validation works correctly
- [ ] Error messages display properly
- [ ] Success messages display properly

---

## Common Bonus Plan Examples

### 1. 100% Welcome Bonus

```json
{
  "name": "100% Welcome Bonus",
  "trigger_type": "deposit",
  "award_type": "percentage",
  "amount": 100,
  "min_deposit": 1000,
  "max_deposit": 50000,
  "wager_requirement_multiplier": 35,
  "wager_requirement_type": "bonus",
  "expiry_days": 30,
  "max_trigger_per_player": 1,
  "cancel_on_withdrawal": true,
  "status": "active"
}
```

### 2. Promotional Code Bonus

```json
{
  "name": "FREE100 Promo Code",
  "trigger_type": "coded",
  "award_type": "flat_amount",
  "amount": 100,
  "bonus_code": "FREE100",
  "max_code_usage": 1000,
  "wager_requirement_multiplier": 10,
  "expiry_days": 7,
  "status": "active"
}
```

### 3. Weekly Cashback

```json
{
  "name": "10% Weekly Cashback",
  "trigger_type": "scheduled_cashback",
  "award_type": "percentage",
  "cashback_percentage": 10,
  "cashback_calculation_period": "weekly",
  "wager_requirement_multiplier": 1,
  "expiry_days": 7,
  "status": "active"
}
```

### 4. VIP Loyalty Bonus

```json
{
  "name": "VIP Level 3 Bonus",
  "trigger_type": "loyalty",
  "award_type": "flat_amount",
  "amount": 5000,
  "vip_level_required": 3,
  "wager_requirement_multiplier": 20,
  "expiry_days": 30,
  "max_trigger_per_player": 1,
  "status": "active"
}
```

---

## Important Notes

### Security Considerations

1. **Bonus Abuse Prevention:**
   - Set `max_trigger_per_player` limits
   - Monitor for multi-accounting
   - Track bonus usage patterns
   - Implement IP/device restrictions (via bonus_restrictions table)

2. **Wagering Requirements:**
   - Standard: 35x-50x for competitive bonuses
   - Low risk: 10x-20x for retention bonuses
   - High value: 50x+ for large bonuses

3. **Dangerous Flags:**
   - `playable_bonus_qualifies: true` - Players can abuse by betting bonus money to complete wagering
   - Only use for specific promotional campaigns

### Performance Considerations

1. **Database Indexes:** All bonus tables have proper indexes
2. **Caching:** Consider caching bonus plan lists
3. **Real-time Updates:** Use polling or WebSockets for live statistics

### Compliance

1. **Audit Trail:** All actions logged in `bonus_audit_log`
2. **Player History:** Complete transaction history in `bonus_transactions`
3. **Terms & Conditions:** Always link T&C in bonus descriptions

---

## Support

For technical issues:
- Backend API: https://backend.jackpotx.net/api
- Database: PostgreSQL bonus_* tables
- Logs: Check backend logs for bonus operations
