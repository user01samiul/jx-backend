# ✅ Game Contribution API - Updated to use game_code

## 🔄 Changes Made

The game contribution endpoints have been updated to use `game_code` (string) instead of `game_id` (integer).

---

## 📊 Updated API Endpoints

### 1. Set Game Contribution

**POST** `/api/admin/bonus/game-contribution`

**Before:**
```json
{
  "game_id": 2813,
  "contribution_percentage": 100,
  "is_restricted": false
}
```

**After:**
```json
{
  "game_code": "12331",
  "contribution_percentage": 100,
  "is_restricted": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Game contribution updated successfully"
}
```

---

### 2. Get Game Contribution

**Before:**
```
GET /api/admin/bonus/game-contribution/2813
```

**After:**
```
GET /api/admin/bonus/game-contribution/12331
```

**Response:**
```json
{
  "success": true,
  "data": {
    "game_code": "12331",
    "game_category": "slots",
    "wagering_contribution_percentage": 100,
    "is_restricted": false,
    "game_id": 2813
  }
}
```

---

## 🗄️ Database Changes

### Migration Applied

A new migration was created and executed:
- **File:** `migration-game-contributions-game-code.sql`
- **Changes:**
  - Added `game_code VARCHAR(255)` column to `game_contributions` table
  - Added unique constraint on `game_code`
  - Added index for faster lookups
  - Made `game_id` nullable (both fields supported for transition)
  - Populated existing `game_code` values from the `games` table

---

## 🔧 Code Changes

### 1. Service Layer (`wagering-engine.service.ts`)

**Before:**
```typescript
static async getGameContribution(gameId: number): Promise<GameContribution>
static async setGameContribution(gameId: number, contributionPercentage: number, isRestricted: boolean)
static async processBetWagering(bonusInstanceId: number, playerId: number, gameId: number, betAmount: number)
```

**After:**
```typescript
static async getGameContribution(gameCode: string): Promise<GameContribution>
static async setGameContribution(gameCode: string, contributionPercentage: number, isRestricted: boolean)
static async processBetWagering(bonusInstanceId: number, playerId: number, gameCode: string, betAmount: number)
```

### 2. Controller (`bonus.controller.ts`)

**Before:**
```typescript
const gameId = parseInt(req.params.gameId);
const contribution = await WageringEngineService.getGameContribution(gameId);
```

**After:**
```typescript
const gameCode = req.params.gameCode;
const contribution = await WageringEngineService.getGameContribution(gameCode);
```

### 3. Validation Schema (`bonus.schema.ts`)

**Before:**
```typescript
export const setGameContributionSchema = z.object({
  game_id: z.number().int().positive(),
  contribution_percentage: z.number().min(0).max(100),
  is_restricted: z.boolean().optional()
});
```

**After:**
```typescript
export const setGameContributionSchema = z.object({
  game_code: z.string().min(1).max(255),
  contribution_percentage: z.number().min(0).max(100),
  is_restricted: z.boolean().optional()
});
```

### 4. Routes (`bonus.routes.ts`)

**Before:**
```typescript
bonusRouter.get('/admin/bonus/game-contribution/:gameId', ...)
```

**After:**
```typescript
bonusRouter.get('/admin/bonus/game-contribution/:gameCode', ...)
```

---

## ✅ Testing Examples

### Test 1: Set Game Contribution

```bash
curl -X POST "https://backend.jackpotx.net/api/admin/bonus/game-contribution" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "game_code": "12331",
    "contribution_percentage": 100,
    "is_restricted": false
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Game contribution updated successfully"
}
```

---

### Test 2: Get Game Contribution

```bash
curl -X GET "https://backend.jackpotx.net/api/admin/bonus/game-contribution/12331" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "game_code": "12331",
    "game_category": "slots",
    "wagering_contribution_percentage": 100,
    "is_restricted": false,
    "game_id": 2813
  }
}
```

---

### Test 3: Common Game Codes

```bash
# Slots - 100% contribution
curl -X POST "https://backend.jackpotx.net/api/admin/bonus/game-contribution" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "game_code": "12331",
    "contribution_percentage": 100,
    "is_restricted": false
  }'

# Table Games - 10% contribution
curl -X POST "https://backend.jackpotx.net/api/admin/bonus/game-contribution" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "game_code": "726",
    "contribution_percentage": 10,
    "is_restricted": false
  }'

# Restricted Game - 0% contribution
curl -X POST "https://backend.jackpotx.net/api/admin/bonus/game-contribution" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "game_code": "769",
    "contribution_percentage": 0,
    "is_restricted": true
  }'
```

---

## 🎯 Game Code Format

Game codes in your database are **numeric strings**:
- `"12331"` - Genie (Slots)
- `"726"` - Red Dragon Baccarat (Table Games)
- `"769"` - VIP Speed Blackjack (Table Games)
- `"4624"` - Olympus Plinko (Slots)
- `"6318"` - Beautiful Peony (Slots)

**Important:** Even though they look like numbers, they must be passed as **strings** in the API.

---

## 🔄 Backward Compatibility

The database migration maintains both `game_id` and `game_code` columns:
- **Frontend:** Uses `game_code` (string)
- **Backend:** Accepts `game_code`, internally references `game_id` when needed
- **Database:** Stores both for reference

This ensures smooth transition without breaking existing data.

---

## 📝 Frontend Update Guide

### Update API Client

**Before:**
```typescript
const setGameContribution = async (gameId: number, percentage: number) => {
  return axios.post('/api/admin/bonus/game-contribution', {
    game_id: gameId,
    contribution_percentage: percentage
  });
};

const getGameContribution = async (gameId: number) => {
  return axios.get(`/api/admin/bonus/game-contribution/${gameId}`);
};
```

**After:**
```typescript
const setGameContribution = async (gameCode: string, percentage: number) => {
  return axios.post('/api/admin/bonus/game-contribution', {
    game_code: gameCode,
    contribution_percentage: percentage
  });
};

const getGameContribution = async (gameCode: string) => {
  return axios.get(`/api/admin/bonus/game-contribution/${gameCode}`);
};
```

### Update Forms

**Before:**
```tsx
<input
  type="number"
  name="game_id"
  placeholder="Enter Game ID (e.g., 2813)"
  value={formData.game_id}
  onChange={(e) => setFormData({ ...formData, game_id: parseInt(e.target.value) })}
/>
```

**After:**
```tsx
<input
  type="text"
  name="game_code"
  placeholder="Enter Game Code (e.g., 12331)"
  value={formData.game_code}
  onChange={(e) => setFormData({ ...formData, game_code: e.target.value })}
/>
```

---

## ✅ Deployment Status

**Migration:** ✅ Applied successfully
**Backend Code:** ✅ Updated and compiled
**Backend Server:** ✅ Restarted with PM2
**Status:** ✅ **Ready for use**

---

## 📞 Support

If you encounter any issues:
1. Check PM2 logs: `pm2 logs backend`
2. Verify database migration: `psql -U postgres -d jackpotx-db -c "\d game_contributions"`
3. Test with curl examples above

---

**Last Updated:** 2025-11-26
**Status:** ✅ Complete
