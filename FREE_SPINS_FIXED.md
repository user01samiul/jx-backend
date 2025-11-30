# Free Spins Campaigns - Issue Fixed ✅

## Problem Identified

Free spins campaigns were **not showing up** in the frontend because of **three critical backend issues**:

### 1. Database Constraint Mismatch ❌
**Issue**: The `user_free_spins_campaigns` table had a CHECK constraint that only allowed `source` values of `'challenge'` or `'loyalty'`, but the backend code was trying to insert `'manual'` for admin-created campaigns.

**Result**: All campaign inserts were **silently failing** due to constraint violations.

### 2. Missing Unique Constraint ❌
**Issue**: The ON CONFLICT clause in INSERT statements referenced `(campaign_code)`, but the actual unique constraint was on `(user_id, campaign_code)`.

**Result**: Database rejected inserts with error: *"there is no unique or exclusion constraint matching the ON CONFLICT specification"*

### 3. Missing Bonus Wallet Data ❌
**Issue**: The API endpoint `/api/campaigns/user/me` was not joining with the `bonus_instances` table to return wagering information.

**Result**: Frontend couldn't display wagering progress, transfer buttons, or completion status.

---

## Solution Implemented ✅

### 1. Database Migration Applied
**File**: `migration-fix-free-spins-campaigns.sql`

Changes made:
- ✅ Updated CHECK constraint to allow `'manual'` and `'admin'` sources
- ✅ Added `bonus_instance_id` column to link campaigns with bonus wallet
- ✅ Fixed unique constraint to `(user_id, campaign_code)`
- ✅ Made `source_id` nullable (not all campaigns have a source ID)

```sql
-- Now allows: 'challenge', 'loyalty', 'manual', 'admin'
ALTER TABLE user_free_spins_campaigns
ADD CONSTRAINT check_source CHECK (source::text = ANY (ARRAY[
  'challenge'::character varying::text,
  'loyalty'::character varying::text,
  'manual'::character varying::text,
  'admin'::character varying::text
]));

-- Link to bonus wallet for wagering tracking
ALTER TABLE user_free_spins_campaigns
ADD COLUMN bonus_instance_id INTEGER REFERENCES bonus_instances(id) ON DELETE SET NULL;

-- Fix unique constraint
ALTER TABLE user_free_spins_campaigns
ADD CONSTRAINT user_free_spins_campaigns_user_campaign_unique
UNIQUE (user_id, campaign_code);
```

### 2. Backend API Enhanced
**File**: `src/routes/campaigns.ts`

Updated endpoints:
- `/api/campaigns/user/me` - Now returns bonus_wallet data
- `/api/campaigns/user/:userId` - Now returns bonus_wallet data

**Response Format** (updated):
```typescript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "campaign_code": "TEST_CAMPAIGN_123",
      "vendor_name": "pragmatic",
      "game_id": 23000,
      "freespins_per_player": 50,
      "freespins_used": 10,
      "freespins_remaining": 40,
      "total_win_amount": 25.50,
      "status": "active",
      "expires_at": "2025-12-31T23:59:59Z",
      // NEW: Bonus wallet data for wagering tracking
      "bonus_wallet": {
        "instance_id": 456,
        "bonus_amount": 25.50,
        "remaining_bonus": 20.00,
        "wagering_required": 127.50,  // 25.50 * 5x wagering
        "wagering_progress": 45.20,
        "wagering_complete_percentage": 35.45,
        "can_withdraw": false,
        "status": "active"
      }
    }
  ]
}
```

### 3. ON CONFLICT Fixed
Updated all INSERT statements to use correct constraint:
```sql
-- OLD (incorrect):
ON CONFLICT (campaign_code) DO NOTHING

-- NEW (correct):
ON CONFLICT (user_id, campaign_code) DO NOTHING
```

---

## How to Create Free Spins Campaigns (Admin Panel)

### Method 1: Create Campaign + Add All Users
This is the **recommended method** for giving free spins to all players.

**Step 1**: Create the campaign
```bash
POST /api/campaigns
Authorization: Bearer <admin_token>

{
  "vendor": "pragmatic",
  "campaign_code": "WELCOME_50_SPINS",
  "currency_code": "USD",
  "freespins_per_player": 50,
  "begins_at": 1704067200,  // Unix timestamp (future date!)
  "expires_at": 1704672000,  // Unix timestamp (7 days later)
  "games": [
    {
      "game_id": 23000,
      "total_bet": 0.50
    }
  ],
  "players": ["23"]  // At least one player required
}
```

**Step 2**: Add all users to the campaign
```bash
POST /api/campaigns/WELCOME_50_SPINS/players/add-all
Authorization: Bearer <admin_token>

{}  // Empty body - adds all active users automatically
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully added 127 users to campaign",
  "count": 127
}
```

### Method 2: Create Campaign for Specific Users
```bash
POST /api/campaigns
Authorization: Bearer <admin_token>

{
  "vendor": "pragmatic",
  "campaign_code": "VIP_100_SPINS",
  "freespins_per_player": 100,
  "begins_at": 1704067200,
  "expires_at": 1704672000,
  "games": [{"game_id": 23000, "total_bet": 1.00}],
  "players": ["23", "45", "67", "89"]  // Specific user IDs
}
```

### Method 3: Add More Players Later
```bash
POST /api/campaigns/VIP_100_SPINS/players/add
Authorization: Bearer <admin_token>

{
  "players": ["123", "456", "789"]
}
```

---

## Available Endpoints

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/campaigns` | GET | List all campaigns |
| `/api/campaigns` | POST | Create new campaign |
| `/api/campaigns/:code` | GET | Get campaign details |
| `/api/campaigns/:code/cancel` | POST | Cancel campaign |
| `/api/campaigns/:code/players/add` | POST | Add specific players |
| `/api/campaigns/:code/players/remove` | POST | Remove players |
| `/api/campaigns/:code/players/add-all` | POST | Add all active users |
| `/api/campaigns/vendors` | GET | List supported vendors |
| `/api/campaigns/game-limits` | GET | Get betting limits |

### Player Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/campaigns/user/me` | GET | Get my campaigns |
| `/api/campaigns/user/:userId` | GET | Get user's campaigns (admin or self) |

---

## Frontend Integration

### 1. Free Spins Page
**Location**: Your frontend should have a "Free Spins" page that displays active campaigns.

**API Call**:
```javascript
import { campaignsAPI } from './api/campaigns';

// Fetch user's campaigns
const response = await campaignsAPI.getUserCampaigns();

if (response.data.success) {
  const campaigns = response.data.data;
  // Display campaigns in UI
}
```

### 2. Required Frontend Features

Your frontend components (`FreeSpinsCampaigns.tsx` and `BonusWallet.tsx`) already have:
- ✅ Campaign listing with countdown timers
- ✅ Free spins counter display
- ✅ Wagering progress bars
- ✅ Transfer to main wallet button
- ✅ Play game button
- ✅ Auto-refresh every 30 seconds

**No frontend changes needed!** The components are already correctly implemented.

### 3. Transfer Winnings to Main Wallet

When wagering is complete (`bonus_wallet.can_withdraw === true`), users can transfer winnings:

```javascript
import { bonusAPI } from './api/bonus';

// Transfer completed bonus to main wallet
await bonusAPI.transferToMain(
  campaign.total_win_amount,
  campaign.bonus_wallet.instance_id
);
```

---

## Testing

### Test Campaign Creation

```bash
# 1. Login as admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Save the access_token from response

# 2. Create campaign
curl -X POST http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor": "pragmatic",
    "campaign_code": "TEST_SPINS_'$(date +%s)'",
    "currency_code": "USD",
    "freespins_per_player": 25,
    "begins_at": '$(date -d "+1 minute" +%s)',
    "expires_at": '$(date -d "+7 days" +%s)',
    "games": [{"game_id": 23000, "total_bet": 0.50}],
    "players": ["23"]
  }'

# 3. Add all users
curl -X POST http://localhost:3001/api/campaigns/TEST_SPINS_*/players/add-all \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'

# 4. Verify (login as user first, then):
curl http://localhost:3001/api/campaigns/user/me \
  -H "Authorization: Bearer <user_token>"
```

### Verify Database

```sql
-- Check campaigns in database
SELECT user_id, campaign_code, freespins_remaining, status, expires_at
FROM user_free_spins_campaigns
WHERE status IN ('pending', 'active')
ORDER BY created_at DESC
LIMIT 10;

-- Check specific user's campaigns
SELECT * FROM user_free_spins_campaigns WHERE user_id = 23;
```

---

## Important Notes

### Campaign Time Requirements
- ⏰ `begins_at` MUST be in the **future** (at least 1 minute from now)
- ⏰ `expires_at` MUST be **after** `begins_at`
- 🕐 Use Unix timestamps (seconds since epoch)

### Campaign Status Flow
1. **pending** → Campaign created, waiting for `begins_at`
2. **active** → Currently active, users can play
3. **completed** → User finished all spins
4. **expired** → Passed `expires_at` date
5. **cancelled** → Manually cancelled by admin

### Supported Vendors
- `pragmatic` - Pragmatic Play
- `3oaks` - 3 Oaks Gaming
- `3oaksP` - 3 Oaks (P version)
- `amigogaming` - Amigo Gaming

### Common Game IDs
- `23000` - Pragmatic Play slot game
- `23001` - Pragmatic Play slot game
- `30000` - 3 Oaks slot game
- (Check `/api/campaigns/game-limits` for full list)

---

## Frontend Update Needed? ❌ NO!

**The frontend code you provided is already correct!** It includes:
- ✅ Proper API calls to `/api/campaigns/user/me`
- ✅ Bonus wallet display with wagering progress
- ✅ Transfer button with `can_withdraw` check
- ✅ Campaign filtering (active, non-expired)
- ✅ Free spins counter display

**No frontend changes are required.**

---

## Summary

### What Was Fixed
1. ✅ Database constraints to allow 'manual' campaigns
2. ✅ Unique constraint to match ON CONFLICT clause
3. ✅ API endpoints to return bonus_wallet data
4. ✅ Backend TypeScript compiled and server restarted

### What Works Now
- ✅ Admins can create campaigns and add all users
- ✅ Campaign data is saved to database correctly
- ✅ Users can see their free spins via API
- ✅ Frontend can display wagering progress
- ✅ Users can transfer completed bonuses to main wallet

### Next Steps for Admin Panel
If your admin panel doesn't have a campaign creation UI yet, you'll need to add:

1. **Campaign Creation Form** with fields:
   - Vendor selection
   - Campaign code input
   - Free spins amount
   - Start/end date pickers (convert to Unix timestamps)
   - Game selection
   - Currency selection

2. **Campaign Management Page** to:
   - List all campaigns
   - Add/remove players
   - Cancel campaigns
   - View campaign statistics

Would you like me to create a sample admin panel component for campaign creation?

---

**Status**: ✅ Backend is FIXED and READY. Frontend requires NO changes.
**Backend Server**: ✅ Running and updated with all fixes.
**Database**: ✅ Migrated with correct constraints.
