# 🎯 Admin Panel - Bonus System API Documentation

Complete reference for all bonus-related admin APIs with request/response examples.

---

## 📑 Table of Contents

1. [Bonus Plan Management](#bonus-plan-management)
2. [Player Bonus Management](#player-bonus-management)
3. [Statistics & Reports](#statistics--reports)
4. [Game Wagering Contributions](#game-wagering-contributions)
5. [Access Control](#access-control)
6. [Missing Features](#missing-features)

---

## 🔐 Access Control

All admin endpoints require authentication and specific roles:

| Role | Permissions |
|------|-------------|
| **Admin** | Full access (CRUD all) |
| **Manager** | Create, Update, View, Grant bonuses |
| **Support** | View only (read bonuses, view stats) |

**Authentication Header:**
```http
Authorization: Bearer <admin_access_token>
```

---

## 1️⃣ Bonus Plan Management

### 1.1 Create Bonus Plan

**Endpoint:** `POST /api/admin/bonus/plans`

**Access:** Admin, Manager

**Description:** Create a new bonus plan (deposit bonus, bonus code, manual bonus, etc.)

**Request Body:**
```json
{
  "name": "Welcome Bonus 100%",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "expiry_days": 30,
  "trigger_type": "deposit",
  "award_type": "percentage",
  "amount": 100,
  "wager_requirement_multiplier": 35,
  "wager_requirement_type": "bonus_plus_deposit",
  "min_deposit": 1000,
  "max_deposit": null,
  "description": "Get 100% match on your first deposit! Wager 35x to unlock.",
  "image_url": "https://cdn.example.com/welcome-bonus.png",
  "is_playable": true,
  "cancel_on_withdrawal": true,
  "max_trigger_per_player": 1,
  "bonus_max_release": 5000,
  "status": "active"
}
```

**Required Fields:**
- `name` (string, 3-255 chars)
- `start_date` (date)
- `end_date` (date)
- `expiry_days` (integer, 1-365)
- `trigger_type` (enum: deposit, coded, manual, loyalty, cashback, etc.)
- `award_type` (enum: flat_amount, percentage)
- `amount` (number, positive)
- `wager_requirement_multiplier` (number, 0-100)

**Optional Fields:**
- `wager_requirement_type` (enum: bonus, bonus_plus_deposit, deposit)
- `min_deposit` (number) - For deposit bonuses
- `max_deposit` (number) - For deposit bonuses
- `bonus_code` (string) - For coded bonuses
- `max_code_usage` (integer) - Limit code usage
- `max_trigger_per_player` (integer) - How many times per player
- `bonus_max_release` (number) - Maximum bonus payout
- `description`, `image_url`, `is_playable`, etc.

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Bonus plan created successfully",
  "data": {
    "id": 123,
    "name": "Welcome Bonus 100%",
    "trigger_type": "deposit",
    "award_type": "percentage",
    "amount": 100.00,
    "wager_requirement_multiplier": 35,
    "status": "active",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Trigger Types Available:**
```typescript
'deposit'              // Auto-grant on deposit
'coded'                // Player enters code
'coupon'               // Coupon-based
'manual'               // Admin manually grants
'loyalty'              // VIP/Loyalty program
'instant_cashback'     // Real-time cashback
'scheduled_cashback'   // Scheduled cashback
'platform_bonus'       // Platform-wide bonus
'product_bonus'        // Product-specific
'freebet'              // Free bet bonus
'betslip_based'        // Based on bet slip
'external_api'         // External integration
'tournament_win'       // Tournament reward
```

---

### 1.2 Update Bonus Plan

**Endpoint:** `PUT /api/admin/bonus/plans/:id`

**Access:** Admin, Manager

**Description:** Update an existing bonus plan (partial update supported)

**Request Body (partial):**
```json
{
  "name": "Updated Welcome Bonus 150%",
  "amount": 150,
  "wager_requirement_multiplier": 40,
  "description": "Even better! Get 150% match on first deposit!",
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bonus plan updated successfully",
  "data": {
    "id": 123,
    "name": "Updated Welcome Bonus 150%",
    "amount": 150.00,
    "wager_requirement_multiplier": 40,
    "updated_at": "2025-01-16T14:20:00Z"
  }
}
```

---

### 1.3 Get Bonus Plan by ID

**Endpoint:** `GET /api/admin/bonus/plans/:id`

**Access:** Admin, Manager, Support

**Description:** Get detailed information about a specific bonus plan

**Request:**
```http
GET /api/admin/bonus/plans/123
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Welcome Bonus 100%",
    "brand_id": 1,
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-12-31T23:59:59Z",
    "expiry_days": 30,
    "trigger_type": "deposit",
    "award_type": "percentage",
    "amount": 100.00,
    "currency": "USD",
    "wager_requirement_multiplier": 35,
    "wager_requirement_type": "bonus_plus_deposit",
    "wager_requirement_action": "release",
    "is_incremental": false,
    "min_deposit": 1000.00,
    "max_deposit": null,
    "description": "Get 100% match on your first deposit!",
    "image_url": "https://cdn.example.com/welcome-bonus.png",
    "is_playable": true,
    "playable_bonus_qualifies": true,
    "release_playable_winnings": true,
    "cancel_on_withdrawal": true,
    "max_trigger_all": null,
    "max_trigger_per_player": 1,
    "min_bonus_threshold": 10.00,
    "bonus_max_release": 5000.00,
    "recurrence_type": "non_recurring",
    "allow_sportsbook": false,
    "allow_poker": false,
    "bonus_code": null,
    "max_code_usage": null,
    "current_code_usage": 0,
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "created_by": 1
  }
}
```

---

### 1.4 Get All Bonus Plans (with Filters & Pagination)

**Endpoint:** `GET /api/admin/bonus/plans`

**Access:** Admin, Manager, Support

**Description:** List all bonus plans with filtering and pagination

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status: active, inactive, expired | `?status=active` |
| `trigger_type` | string | Filter by type: deposit, coded, etc. | `?trigger_type=deposit` |
| `brand_id` | integer | Filter by brand | `?brand_id=1` |
| `limit` | integer | Items per page (1-100) | `?limit=20` |
| `offset` | integer | Starting position | `?offset=0` |

**Request:**
```http
GET /api/admin/bonus/plans?status=active&trigger_type=deposit&limit=20&offset=0
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "Welcome Bonus 100%",
      "trigger_type": "deposit",
      "award_type": "percentage",
      "amount": 100.00,
      "wager_requirement_multiplier": 35,
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": 124,
      "name": "Second Deposit Bonus 50%",
      "trigger_type": "deposit",
      "award_type": "percentage",
      "amount": 50.00,
      "wager_requirement_multiplier": 30,
      "status": "active",
      "created_at": "2025-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 1.5 Delete Bonus Plan

**Endpoint:** `DELETE /api/admin/bonus/plans/:id`

**Access:** Admin only

**Description:** Soft delete a bonus plan (sets status to deleted)

**Request:**
```http
DELETE /api/admin/bonus/plans/123
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bonus plan deleted successfully"
}
```

**⚠️ Note:** This is a soft delete. Active bonuses granted from this plan will continue to work.

---

## 2️⃣ Player Bonus Management

### 2.1 Grant Manual Bonus to Player

**Endpoint:** `POST /api/admin/bonus/grant-manual`

**Access:** Admin, Manager

**Description:** Manually grant a bonus to a specific player

**Request Body:**
```json
{
  "player_id": 789,
  "bonus_plan_id": 456,
  "custom_amount": 250.00,
  "notes": "VIP compensation bonus for technical issue on 2025-01-15"
}
```

**Required Fields:**
- `player_id` (integer) - Player user ID
- `bonus_plan_id` (integer) - Must be a "manual" trigger_type bonus plan
- `notes` (string, max 500 chars) - Reason for granting

**Optional Fields:**
- `custom_amount` (number) - Override bonus plan amount

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Manual bonus granted successfully",
  "data": {
    "id": 9876,
    "bonus_plan_id": 456,
    "player_id": 789,
    "bonus_amount": 250.00,
    "remaining_bonus": 250.00,
    "wager_requirement_amount": 2500.00,
    "wager_progress_amount": 0.00,
    "wager_percentage_complete": 0,
    "status": "active",
    "granted_at": "2025-01-16T10:30:00Z",
    "expires_at": "2025-02-15T10:30:00Z",
    "notes": "VIP compensation bonus for technical issue on 2025-01-15",
    "granted_by": 1
  }
}
```

---

### 2.2 Get Player Bonuses (Admin View)

**Endpoint:** `GET /api/admin/bonus/player/:playerId/bonuses`

**Access:** Admin, Manager, Support

**Description:** View all bonuses for a specific player (includes history)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: active, completed, expired, forfeited |
| `limit` | integer | Items per page (1-100) |
| `offset` | integer | Starting position |

**Request:**
```http
GET /api/admin/bonus/player/789/bonuses?status=active&limit=10&offset=0
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 9876,
      "bonus_plan_id": 456,
      "player_id": 789,
      "bonus_type": "manual",
      "bonus_amount": 250.00,
      "remaining_bonus": 180.50,
      "wager_requirement_amount": 2500.00,
      "wager_requirement_multiplier": 10,
      "wager_progress_amount": 750.00,
      "wager_percentage_complete": 30.00,
      "status": "wagering",
      "granted_at": "2025-01-15T10:30:00Z",
      "activated_at": "2025-01-15T11:00:00Z",
      "expires_at": "2025-02-15T10:30:00Z",
      "notes": "VIP compensation bonus",
      "granted_by": 1,
      "bonus_plan": {
        "id": 456,
        "name": "Manual VIP Bonus",
        "trigger_type": "manual"
      }
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

---

### 2.3 Forfeit Bonus (Admin)

**Endpoint:** `POST /api/admin/bonus/instances/:id/forfeit`

**Access:** Admin, Manager

**Description:** Forcefully forfeit a player's bonus (removes bonus balance)

**Request Body:**
```json
{
  "reason": "Terms violation - suspicious gameplay detected on 2025-01-16"
}
```

**Required Fields:**
- `reason` (string, 5-500 chars) - Detailed reason for forfeiture

**Request:**
```http
POST /api/admin/bonus/instances/9876/forfeit
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Terms violation - suspicious gameplay detected on 2025-01-16"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bonus forfeited successfully"
}
```

**⚠️ Important:** This action:
- Sets bonus status to "forfeited"
- Removes remaining bonus balance from player's bonus wallet
- Creates audit log entry
- Cannot be undone

---

## 3️⃣ Statistics & Reports

### 3.1 Get Bonus System Statistics

**Endpoint:** `GET /api/admin/bonus/statistics`

**Access:** Admin, Manager

**Description:** Get overall statistics for the bonus system

**Request:**
```http
GET /api/admin/bonus/statistics
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalActiveBonuses": 1247,
    "totalPlayersWithBonus": 892,
    "totalBonusValue": 125780.50,
    "totalWageringProgress": 3456789.00,
    "completionRate": 32.5
  }
}
```

**Field Descriptions:**
| Field | Description |
|-------|-------------|
| `totalActiveBonuses` | Count of all active/wagering bonuses |
| `totalPlayersWithBonus` | Unique players with active bonuses |
| `totalBonusValue` | Sum of all remaining bonus balance |
| `totalWageringProgress` | Total wagering completed across all bonuses |
| `completionRate` | Percentage of bonuses that reach completion |

---

## 4️⃣ Game Wagering Contributions

Game wagering contributions control how much each game contributes to bonus wagering requirements. For example:
- Slots: 100% (every $1 bet counts as $1 wagering)
- Table Games: 20% (every $1 bet counts as $0.20 wagering)
- Live Casino: 10%

### 4.1 Set Game Contribution

**Endpoint:** `POST /api/admin/bonus/game-contribution`

**Access:** Admin, Manager

**Description:** Set wagering contribution percentage for a specific game

**Request Body:**
```json
{
  "game_id": 555,
  "contribution_percentage": 100,
  "is_restricted": false
}
```

**Request Fields:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `game_id` | integer | Game ID | 555 |
| `contribution_percentage` | number | Wagering % (0-100) | 100 = full, 20 = 20% |
| `is_restricted` | boolean | Block game for bonus players | false |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Game contribution updated successfully"
}
```

**Examples:**
```json
// Slots (100% contribution)
{ "game_id": 555, "contribution_percentage": 100, "is_restricted": false }

// Blackjack (20% contribution)
{ "game_id": 556, "contribution_percentage": 20, "is_restricted": false }

// Restricted game (blocked for bonus play)
{ "game_id": 557, "contribution_percentage": 0, "is_restricted": true }
```

---

### 4.2 Get Game Contribution

**Endpoint:** `GET /api/admin/bonus/game-contribution/:gameId`

**Access:** Admin, Manager, Support

**Description:** Get current wagering contribution for a game

**Request:**
```http
GET /api/admin/bonus/game-contribution/555
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "game_id": 555,
    "contribution_percentage": 100.00,
    "is_restricted": false,
    "updated_at": "2025-01-10T15:20:00Z"
  }
}
```

**Default Behavior:** If no contribution is set, defaults to 100% (full wagering contribution).

---

## 5️⃣ Error Responses

All endpoints follow the same error response format:

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "message": "Bonus plan not found"
}
```

**Common Error Codes:**
| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Bonus plan/player not found |
| 500 | Server Error | Database error |

---

## 6️⃣ Missing Features (Recommendations)

### ⚠️ Features That May Be Needed

Based on the current implementation, here are features that might be missing for a complete admin panel:

#### 🔴 **Critical Missing Features**

1. **Bulk Operations**
   - ❌ Bulk grant bonuses to multiple players
   - ❌ Bulk forfeit bonuses
   - ❌ Bulk update game contributions (by category)
   - ✅ Recommendation: Add endpoints for bulk operations

2. **Bonus Plan Cloning**
   - ❌ Clone existing bonus plan
   - ✅ Recommendation: `POST /api/admin/bonus/plans/:id/clone`

3. **Detailed Analytics**
   - ❌ Bonus plan performance (conversion rate, wagering completion)
   - ❌ Player bonus history with transactions
   - ❌ Revenue impact per bonus plan
   - ✅ Recommendation: Add analytics endpoints

4. **Bonus Plan Templates**
   - ❌ Save/load bonus plan templates
   - ✅ Recommendation: Create template system

#### 🟡 **Nice-to-Have Features**

5. **Advanced Filters**
   - ⚠️ Filter bonuses by date range
   - ⚠️ Filter by bonus value range
   - ⚠️ Search by player name/email
   - ✅ Recommendation: Enhance filtering

6. **Bonus Transactions**
   - ⚠️ View player bonus transactions (admin view)
   - ⚠️ Export transactions to CSV
   - ✅ Recommendation: Add transaction endpoints

7. **Audit Log**
   - ⚠️ View audit log for admin actions
   - ⚠️ Track who granted/forfeited bonuses
   - ✅ Recommendation: Add audit log viewing endpoint

8. **Player Restrictions**
   - ❌ Blacklist players from certain bonuses
   - ❌ Set player-specific bonus limits
   - ✅ Recommendation: Add player restriction management

9. **Automated Rules**
   - ❌ Auto-forfeit bonuses on specific conditions
   - ❌ Auto-expire after inactivity
   - ❌ Scheduled bonus activations
   - ✅ Recommendation: Add automation rules

10. **Reporting**
    - ❌ Export bonus plans to CSV/Excel
    - ❌ Export player bonuses to CSV
    - ❌ Generate bonus performance reports
    - ✅ Recommendation: Add export endpoints

---

## 7️⃣ Complete Endpoint Summary

### Bonus Plan Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/admin/bonus/plans` | Admin, Manager | Create bonus plan |
| PUT | `/api/admin/bonus/plans/:id` | Admin, Manager | Update bonus plan |
| GET | `/api/admin/bonus/plans/:id` | Admin, Manager, Support | Get bonus plan |
| GET | `/api/admin/bonus/plans` | Admin, Manager, Support | List bonus plans |
| DELETE | `/api/admin/bonus/plans/:id` | Admin | Delete bonus plan |

### Player Management
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/admin/bonus/grant-manual` | Admin, Manager | Grant manual bonus |
| GET | `/api/admin/bonus/player/:playerId/bonuses` | Admin, Manager, Support | Get player bonuses |
| POST | `/api/admin/bonus/instances/:id/forfeit` | Admin, Manager | Forfeit bonus |

### Statistics
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/bonus/statistics` | Admin, Manager | Get system statistics |

### Game Contributions
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/admin/bonus/game-contribution` | Admin, Manager | Set game contribution |
| GET | `/api/admin/bonus/game-contribution/:gameId` | Admin, Manager, Support | Get game contribution |

---

## 8️⃣ Quick Start Example

### Example: Create and Grant a Welcome Bonus

**Step 1: Create the bonus plan**
```bash
curl -X POST https://backend.jackpotx.net/api/admin/bonus/plans \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Player Welcome Bonus",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "expiry_days": 30,
    "trigger_type": "deposit",
    "award_type": "percentage",
    "amount": 100,
    "wager_requirement_multiplier": 35,
    "min_deposit": 1000,
    "status": "active"
  }'
```

**Step 2: Grant manually to a VIP player**
```bash
curl -X POST https://backend.jackpotx.net/api/admin/bonus/grant-manual \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "player_id": 789,
    "bonus_plan_id": 123,
    "custom_amount": 500,
    "notes": "VIP welcome bonus"
  }'
```

**Step 3: Check system statistics**
```bash
curl -X GET https://backend.jackpotx.net/api/admin/bonus/statistics \
  -H "Authorization: Bearer <admin_token>"
```

---

## 📞 Support

- **API Base URL:** `https://backend.jackpotx.net/api`
- **Swagger Docs:** `https://backend.jackpotx.net/api-docs`
- **PM2 Logs:** `pm2 logs backend`
- **Database:** PostgreSQL (bonus_plans, bonus_instances, bonus_transactions tables)

---

**Last Updated:** 2025-01-26
**API Version:** 1.0.0
**Status:** ✅ Production Ready
