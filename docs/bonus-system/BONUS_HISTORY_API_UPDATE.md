# Bonus History API - Pagination & Status Update

## 📋 Summary

The `/api/bonus/my-bonuses` endpoint has been updated to provide better pagination support and enhanced status tracking for the bonus wallet frontend.

## 🔄 What Changed

### 1. **Enhanced Response Format**

The endpoint now returns comprehensive bonus plan information and calculated status:

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "bonus_plan_id": 456,
      "player_id": 789,
      "bonus_type": "bonus_code",
      "status": "completed",
      "bonus_amount": 100.00,
      "wager_requirement_amount": 1000.00,
      "wager_requirement_multiplier": 10,
      "wager_requirement_type": "bonus",
      "wager_progress_amount": 1000.00,
      "wager_percentage_complete": 100,
      "granted_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-20T15:45:00Z",
      "expires_at": "2024-02-15T10:30:00Z",
      "code_used": "WELCOME100",
      "bonus_plan": {
        "id": 456,
        "name": "Welcome Code Bonus - $100",
        "description": "Get $100 bonus! Use code WELCOME100...",
        "image_url": "https://...",
        "bonus_code": "WELCOME100",
        "bonus_type": "coded"
      }
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 10,
    "offset": 0
  }
}
```

### 2. **New Fields Added**

| Field | Type | Description |
|-------|------|-------------|
| `bonus_type` | string | Type of bonus (bonus_code, deposit, loyalty, etc.) |
| `wager_requirement_multiplier` | number | Multiplier used (e.g., 10x, 25x, 35x) |
| `wager_requirement_type` | string | Type of wagering (bonus, bonus_plus_deposit, deposit) |
| `bonus_plan` | object | Nested object with bonus plan details |

### 3. **Dynamic Status Calculation**

The `status` field is now calculated dynamically:

```sql
CASE
  WHEN wager_progress_amount >= wager_requirement_amount THEN 'completed'
  WHEN NOW() > expires_at THEN 'expired'
  WHEN status = 'forfeited' THEN 'forfeited'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE status  -- 'active' or 'wagering'
END
```

**Status Values:**
- `'completed'` - Wagering requirement fully met ✅
- `'active'` - Bonus is active, wagering in progress
- `'wagering'` - Actively wagering
- `'expired'` - Bonus expired before completion
- `'forfeited'` - User forfeited the bonus
- `'cancelled'` - Bonus was cancelled

### 4. **Pagination Support** (Already Working!)

The endpoint already supported pagination. Here's how to use it:

**Request:**
```http
GET /api/bonus/my-bonuses?limit=10&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Number of items per page |
| `offset` | integer | 0 | Starting position |
| `status` | string | - | Filter by status (optional) |

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 156,    // Total count of all bonuses
    "limit": 10,     // Items per page
    "offset": 0      // Current offset
  }
}
```

## 📊 Frontend Integration

### Checking Bonus Status

```javascript
// Check if bonus is claimed
const isBonusPlanClaimed = (bonusPlanId) => {
  return bonusHistory.some(b => b.bonus_plan_id === bonusPlanId);
};

// Get bonus status for button display
const getBonusStatus = (bonusPlanId) => {
  const bonus = bonusHistory.find(b => b.bonus_plan_id === bonusPlanId);
  if (!bonus) return null;
  return bonus.status; // Returns: completed, active, wagering, expired, etc.
};
```

### Button Display Logic

```javascript
{isBonusPlanClaimed(bonus.id) ? (
  <div
    className="button"
    style={{
      backgroundColor: getBonusStatus(bonus.id) === 'completed' ? '#8B5CF6' : '#10B981'
    }}
  >
    <Check className="icon" />
    {getBonusStatus(bonus.id) === 'completed' ? 'Completed' : 'Applied'}
  </div>
) : (
  <button onClick={() => applyBonus(bonus.code)}>
    Apply Now
  </button>
)}
```

### Pagination Implementation

```javascript
// Calculate total pages
const totalPages = Math.ceil(bonusHistory.total / limit);

// Fetch page
const fetchBonusHistory = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const response = await axios.get(
    `/api/bonus/my-bonuses?limit=${limit}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return {
    bonuses: response.data.data,
    total: response.data.pagination.total,
    currentPage: page
  };
};
```

## 🧪 Testing

Use the provided test script to verify the API:

```bash
node test-bonus-history-pagination.js
```

The test script checks:
- ✅ Pagination (limit, offset, total)
- ✅ Response format with all required fields
- ✅ Nested bonus_plan object
- ✅ Status calculation (completed vs active)
- ✅ No overlap between pages
- ✅ Status filtering

## 📝 Database Query

The service now fetches comprehensive data:

```sql
SELECT
  bi.*,
  bp.id as plan_id,
  bp.name as plan_name,
  bp.description as plan_description,
  bp.image_url as plan_image_url,
  bp.bonus_code as plan_bonus_code,
  bp.trigger_type as plan_trigger_type,
  bp.wager_requirement_multiplier as plan_wager_multiplier,
  bp.wager_requirement_type as plan_wager_type,
  CASE
    WHEN bi.wager_progress_amount >= bi.wager_requirement_amount THEN 'completed'
    WHEN NOW() > bi.expires_at THEN 'expired'
    WHEN bi.status = 'forfeited' THEN 'forfeited'
    WHEN bi.status = 'cancelled' THEN 'cancelled'
    ELSE bi.status
  END as computed_status
FROM bonus_instances bi
INNER JOIN bonus_plans bp ON bi.bonus_plan_id = bp.id
WHERE bi.player_id = $1
ORDER BY bi.granted_at DESC
LIMIT $2 OFFSET $3
```

## 🔗 Related Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/bonus/my-bonuses` | Get bonus history with pagination |
| `GET /api/bonus/active` | Get only active bonuses |
| `GET /api/bonus/available` | Get available bonuses to claim |
| `POST /api/bonus/apply-code` | Apply a bonus code |

## ⚠️ Important Notes

1. **Status Priority**: The computed status takes precedence over stored status
2. **bonus_plan_id Matching**: Ensure the ID from `/available-bonuses` matches the ID in history
3. **Pagination Performance**: Default limit is 50, but 10 is recommended for UI
4. **Caching**: Consider caching the bonus history and refreshing every 30 seconds

## 🎯 Example Use Cases

### Show "Applied" vs "Completed" on Bonus Cards

```javascript
const statusConfig = {
  'completed': {
    label: 'Completed',
    color: '#8B5CF6', // Purple
    icon: <CheckCircle />
  },
  'active': {
    label: 'Applied',
    color: '#10B981', // Green
    icon: <Check />
  },
  'wagering': {
    label: 'Applied',
    color: '#10B981', // Green
    icon: <Check />
  },
  'expired': {
    label: 'Expired',
    color: '#EF4444', // Red
    icon: <XCircle />
  }
};

const config = statusConfig[bonus.status] || statusConfig.active;
```

### Load History on Page Mount

```javascript
useEffect(() => {
  fetchBonusData();        // Available bonuses
  fetchBonusHistory();     // History to check claimed status

  const interval = setInterval(() => {
    fetchBonusData();
    fetchBonusHistory();
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs backend`
2. Run test script: `node test-bonus-history-pagination.js`
3. Verify database: Check `bonus_instances` and `bonus_plans` tables
4. Check Swagger docs: `https://backend.jackpotx.net/api-docs`

---

**Last Updated:** 2024-11-26
**Backend Version:** 1.0.0
**API Base URL:** `https://backend.jackpotx.net/api`
