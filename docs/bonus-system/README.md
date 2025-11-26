# 🎰 Bonus System Documentation

Complete documentation for the JackpotX Bonus System - Backend APIs for both User Frontend and Admin Panel.

---

## 📚 Documentation Index

### 👤 User Frontend Documentation
| Document | Description |
|----------|-------------|
| [BONUS_HISTORY_API_UPDATE.md](./BONUS_HISTORY_API_UPDATE.md) | User bonus history API with pagination & status |
| [TRANSACTIONS_PAGINATION_STATUS.md](./TRANSACTIONS_PAGINATION_STATUS.md) | User bonus transactions pagination |

### 🔧 Admin Panel Documentation
| Document | Description |
|----------|-------------|
| **[ADMIN_SUMMARY.md](./ADMIN_SUMMARY.md)** | **📌 START HERE** - Quick overview & implementation guide |
| [ADMIN_PANEL_API.md](./ADMIN_PANEL_API.md) | Complete API reference with request/response examples |
| [MISSING_ADMIN_FEATURES.md](./MISSING_ADMIN_FEATURES.md) | Recommended features not yet implemented |

---

## 🚀 Quick Start

### For Admin Panel Developers

**Read these in order:**

1. **[ADMIN_SUMMARY.md](./ADMIN_SUMMARY.md)** - Get the big picture
   - What's working
   - What's missing
   - Quick API reference
   - Implementation checklist

2. **[ADMIN_PANEL_API.md](./ADMIN_PANEL_API.md)** - API details
   - Full endpoint documentation
   - Request/response examples
   - Error handling
   - Access control

3. **[MISSING_ADMIN_FEATURES.md](./MISSING_ADMIN_FEATURES.md)** - Future features
   - 10 recommended features
   - Priority recommendations
   - Implementation guidelines

---

## ✅ What's Currently Available

### 🎯 Admin Endpoints (9 total)

#### Bonus Plan Management (5)
- `POST /api/admin/bonus/plans` - Create
- `PUT /api/admin/bonus/plans/:id` - Update
- `GET /api/admin/bonus/plans/:id` - Get single
- `GET /api/admin/bonus/plans` - List with pagination
- `DELETE /api/admin/bonus/plans/:id` - Delete

#### Player Management (3)
- `POST /api/admin/bonus/grant-manual` - Grant bonus
- `GET /api/admin/bonus/player/:playerId/bonuses` - View player bonuses
- `POST /api/admin/bonus/instances/:id/forfeit` - Forfeit bonus

#### Statistics (1)
- `GET /api/admin/bonus/statistics` - System stats

#### Game Contributions (2)
- `POST /api/admin/bonus/game-contribution` - Set contribution
- `GET /api/admin/bonus/game-contribution/:gameId` - Get contribution

---

### 👤 User Endpoints

#### Bonus Management
- `GET /api/bonus/available` - Get available bonuses
- `POST /api/bonus/apply-code` - Apply bonus code
- `GET /api/bonus/my-bonuses` - Get bonus history (with pagination)
- `GET /api/bonus/active` - Get active bonuses
- `GET /api/bonus/wallet` - Get bonus wallet balance
- `GET /api/bonus/transactions` - Get transactions (with pagination)
- `GET /api/bonus/wagering-progress` - Get wagering progress

---

## 🔐 Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer <access_token>
```

### Admin Access Roles

| Role | Permissions |
|------|-------------|
| Admin | Full CRUD access |
| Manager | Create, Update, Grant, View |
| Support | View only |

---

## 📋 Common Response Format

### Success
```json
{
  "success": true,
  "data": { /* response data */ },
  "pagination": {  // For list endpoints
    "total": 156,
    "limit": 20,
    "offset": 0
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🎯 Bonus Types Supported

| Type | Description | Trigger |
|------|-------------|---------|
| `deposit` | Match deposit bonus | Auto on deposit |
| `coded` | Bonus code | User enters code |
| `manual` | Admin grants | Admin action |
| `loyalty` | VIP rewards | Loyalty system |
| `instant_cashback` | Real-time cashback | Auto |
| `scheduled_cashback` | Periodic cashback | Scheduled |

---

## 📊 Database Tables

### Core Tables
- `bonus_plans` - Bonus plan configurations
- `bonus_instances` - Player bonus instances
- `bonus_transactions` - Transaction history
- `bonus_wallets` - Player bonus wallet balances
- `bonus_wager_progress` - Wagering tracking
- `bonus_audit_log` - Admin action audit trail
- `game_wager_contributions` - Game contribution settings

---

## 🧪 Testing

### Using cURL

```bash
# Get admin token (replace with your credentials)
TOKEN=$(curl -X POST https://backend.jackpotx.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}' \
  | jq -r '.data.accessToken')

# Test admin endpoint
curl -X GET "https://backend.jackpotx.net/api/admin/bonus/plans?status=active" \
  -H "Authorization: Bearer $TOKEN"
```

### Using Test Scripts

```bash
# Test bonus history pagination
node test-bonus-history-pagination.js

# Test transactions pagination
node test-bonus-transactions-pagination.js

# Test available bonuses
node test-available-bonuses.js
```

---

## 🔍 API Documentation

### Swagger UI
Access interactive API docs at:
```
https://backend.jackpotx.net/api-docs
```

---

## 📞 Support

### Logs
```bash
pm2 logs backend --lines 100
```

### Database
```bash
psql -U postgres -d jackpotx-db
```

### Key Tables to Check
```sql
-- View all bonus plans
SELECT id, name, trigger_type, status FROM bonus_plans;

-- View active bonuses
SELECT id, player_id, bonus_amount, status FROM bonus_instances WHERE status = 'active';

-- View recent transactions
SELECT id, player_id, transaction_type, amount, created_at
FROM bonus_transactions
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🚦 Status

| Component | Status |
|-----------|--------|
| Backend APIs | ✅ Production Ready |
| Documentation | ✅ Complete |
| User Frontend | ✅ Ready (pagination implemented) |
| Admin Panel Frontend | ⏳ Implementation Needed |

---

## 📈 Roadmap

### Phase 1: Core Admin Panel ✅ (Complete)
- [x] Bonus plan CRUD
- [x] Manual bonus granting
- [x] Player bonus viewing
- [x] Basic statistics
- [x] Game contributions

### Phase 2: Enhanced Features (Recommended)
- [ ] Bulk operations
- [ ] Detailed analytics
- [ ] Bonus transactions (admin view)
- [ ] Audit log viewer
- [ ] Player restrictions

### Phase 3: Advanced Features (Future)
- [ ] Automated rules
- [ ] Templates system
- [ ] Export/reporting
- [ ] Advanced filtering

---

## 🛠️ Implementation Guide

### For Frontend Developers

1. **Read Documentation:**
   - Start with [ADMIN_SUMMARY.md](./ADMIN_SUMMARY.md)
   - Reference [ADMIN_PANEL_API.md](./ADMIN_PANEL_API.md) for details

2. **Set Up API Client:**
   - Use axios or fetch
   - Add authentication headers
   - Handle errors gracefully

3. **Build Core Pages:**
   - Bonus plans list
   - Create/edit form
   - Player bonus search
   - Grant manual bonus
   - Dashboard with stats

4. **Add Pagination:**
   - Use limit/offset parameters
   - Display total count
   - Page numbers UI

5. **Implement Forms:**
   - Validate required fields
   - Handle conditional fields
   - Show success/error messages

---

## 📦 API Client Example

```typescript
import axios from 'axios';

const API_BASE = 'https://backend.jackpotx.net/api';

// Create axios instance with auth
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${getAccessToken()}`,
    'Content-Type': 'application/json'
  }
});

// Admin Bonus API
export const bonusAdminAPI = {
  // Plans
  getPlans: (params) => api.get('/admin/bonus/plans', { params }),
  getPlan: (id) => api.get(`/admin/bonus/plans/${id}`),
  createPlan: (data) => api.post('/admin/bonus/plans', data),
  updatePlan: (id, data) => api.put(`/admin/bonus/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/admin/bonus/plans/${id}`),

  // Player Management
  getPlayerBonuses: (playerId, params) =>
    api.get(`/admin/bonus/player/${playerId}/bonuses`, { params }),
  grantManual: (data) => api.post('/admin/bonus/grant-manual', data),
  forfeitBonus: (instanceId, reason) =>
    api.post(`/admin/bonus/instances/${instanceId}/forfeit`, { reason }),

  // Stats
  getStatistics: () => api.get('/admin/bonus/statistics')
};
```

---

## 🎓 Learning Resources

### Key Concepts

**Wagering Requirements:**
- Multiplier (e.g., 35x) determines total wagering needed
- Types: bonus only, bonus+deposit, deposit only
- Contributions: Different games contribute different %

**Bonus Types:**
- Deposit: Auto-granted on qualifying deposit
- Coded: Requires user to enter code
- Manual: Admin manually grants

**Dual Wallet:**
- Main wallet: Real money (withdrawable)
- Bonus wallet: Bonus money (locked until wagering met)
- Bets use main wallet first, then bonus wallet

---

## ✨ Best Practices

### For Admin Panel UI

1. **Show Clear Status:**
   - Active (green)
   - Completed (purple)
   - Expired (gray)
   - Forfeited (red)

2. **Provide Filters:**
   - Status filter
   - Type filter
   - Date range

3. **Add Confirmation:**
   - Confirm before delete
   - Confirm before forfeit
   - Show impact warnings

4. **Display Progress:**
   - Wagering progress bars
   - Percentage complete
   - Time remaining

5. **Log Actions:**
   - Track who did what
   - Show timestamps
   - Allow audit trail viewing

---

## 📌 Important Notes

### Security
- All endpoints require authentication
- Role-based access control enforced
- Sensitive actions logged to audit trail
- Rate limiting applied

### Data Validation
- All inputs validated server-side
- Zod schemas enforce data types
- Business rules enforced in services

### Performance
- Pagination prevents large data loads
- Indexes on key fields (player_id, status, created_at)
- Connection pooling (500 max connections)

---

## 🎯 Quick Links

- **Production API:** https://backend.jackpotx.net/api
- **Swagger Docs:** https://backend.jackpotx.net/api-docs
- **Admin Summary:** [ADMIN_SUMMARY.md](./ADMIN_SUMMARY.md)
- **Full API Docs:** [ADMIN_PANEL_API.md](./ADMIN_PANEL_API.md)
- **Missing Features:** [MISSING_ADMIN_FEATURES.md](./MISSING_ADMIN_FEATURES.md)

---

**Version:** 1.0.0
**Last Updated:** 2025-01-26
**Status:** ✅ Complete & Production Ready
