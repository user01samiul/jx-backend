# ⚠️ Missing Admin Panel Features - Recommendations

This document lists features that are **NOT currently implemented** but would be valuable for a complete admin panel.

---

## 🔴 Critical Missing Features

### 1. Bulk Operations

**Current State:** ❌ Not implemented

**What's Missing:**
- Bulk grant bonuses to multiple players at once
- Bulk forfeit bonuses
- Bulk update game contribution percentages (by category)

**Recommended Endpoints:**

```typescript
// Bulk grant bonuses
POST /api/admin/bonus/bulk-grant
{
  "player_ids": [123, 456, 789],
  "bonus_plan_id": 10,
  "notes": "Monthly VIP reward"
}

// Bulk forfeit
POST /api/admin/bonus/bulk-forfeit
{
  "bonus_instance_ids": [1001, 1002, 1003],
  "reason": "Terms violation"
}

// Bulk set game contributions by category
POST /api/admin/bonus/game-contribution/bulk
{
  "game_category": "slots",  // or "table_games", "live_casino"
  "contribution_percentage": 100
}
```

**Business Impact:** High - Saves admin time when managing many players

---

### 2. Bonus Plan Cloning

**Current State:** ❌ Not implemented

**What's Missing:**
- Clone an existing bonus plan to create a new one
- Useful for creating similar plans with minor tweaks

**Recommended Endpoint:**

```typescript
POST /api/admin/bonus/plans/:id/clone
{
  "name": "VIP Welcome Bonus 200% (Copy)",
  "start_date": "2025-02-01",
  "end_date": "2025-03-01"
}

Response:
{
  "success": true,
  "message": "Bonus plan cloned successfully",
  "data": {
    "id": 456,
    "name": "VIP Welcome Bonus 200% (Copy)",
    "cloned_from": 123
  }
}
```

**Business Impact:** Medium - Improves admin efficiency

---

### 3. Detailed Bonus Analytics

**Current State:** ⚠️ Partially implemented (only basic stats)

**What's Missing:**
- Bonus plan performance metrics (conversion rate, completion rate per plan)
- Revenue impact analysis (cost of bonus vs player LTV)
- Player bonus journey (timeline of all bonus actions)
- Wagering progression charts

**Recommended Endpoints:**

```typescript
// Get bonus plan performance
GET /api/admin/bonus/plans/:id/analytics
Response:
{
  "success": true,
  "data": {
    "bonus_plan_id": 123,
    "total_granted": 1500,
    "total_completed": 450,
    "completion_rate": 30.0,
    "total_bonus_cost": 150000.00,
    "total_wagered": 5250000.00,
    "average_wager_time_hours": 48.5,
    "revenue_impact": {
      "bonus_cost": 150000.00,
      "wagering_generated": 5250000.00,
      "house_edge_revenue": 105000.00,
      "roi": 0.7
    }
  }
}

// Get player bonus timeline
GET /api/admin/bonus/player/:playerId/timeline
Response:
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "action": "bonus_granted",
      "bonus_plan_name": "Welcome Bonus",
      "amount": 100.00,
      "admin_user": "admin@example.com"
    },
    {
      "timestamp": "2025-01-15T11:00:00Z",
      "action": "wagering_started",
      "wager_required": 3500.00
    },
    {
      "timestamp": "2025-01-16T08:30:00Z",
      "action": "wagering_completed",
      "amount_released": 95.50
    }
  ]
}
```

**Business Impact:** High - Critical for ROI analysis

---

### 4. Bonus Transactions (Admin View)

**Current State:** ❌ Not implemented

**What's Missing:**
- View all bonus transactions for a player (admin view)
- Filter transactions by type, date, amount
- Export transactions to CSV

**Recommended Endpoints:**

```typescript
// Get player bonus transactions (admin)
GET /api/admin/bonus/player/:playerId/transactions
Query params: ?type=granted&startDate=2025-01-01&limit=50&offset=0

Response:
{
  "success": true,
  "data": [
    {
      "id": 5001,
      "bonus_instance_id": 9876,
      "transaction_type": "granted",
      "amount": 100.00,
      "balance_before": 50.00,
      "balance_after": 150.00,
      "description": "Welcome bonus granted",
      "created_at": "2025-01-15T10:30:00Z",
      "admin_user": "admin@example.com"
    }
  ],
  "pagination": {
    "total": 250,
    "limit": 50,
    "offset": 0
  }
}

// Export transactions
GET /api/admin/bonus/player/:playerId/transactions/export?format=csv
```

**Business Impact:** Medium - Important for support and auditing

---

## 🟡 Nice-to-Have Features

### 5. Advanced Search & Filtering

**Current State:** ⚠️ Basic filtering only

**What's Missing:**
- Search bonus plans by name
- Filter by bonus value range
- Filter by date range (created_at, expires_at)
- Search players by email/username when viewing bonuses

**Recommended Enhancement:**

```typescript
GET /api/admin/bonus/plans?search=welcome&minAmount=50&maxAmount=200&createdAfter=2025-01-01
```

**Business Impact:** Low-Medium - Improves UX

---

### 6. Player Bonus Restrictions

**Current State:** ❌ Not implemented

**What's Missing:**
- Blacklist specific players from certain bonus types
- Set player-specific bonus limits
- Country/region restrictions per bonus

**Recommended Endpoints:**

```typescript
// Add player restriction
POST /api/admin/bonus/player/:playerId/restrictions
{
  "bonus_plan_id": 123,
  "restriction_type": "blacklist",
  "reason": "Bonus abuse detected",
  "expires_at": null  // Permanent
}

// Get player restrictions
GET /api/admin/bonus/player/:playerId/restrictions
```

**Business Impact:** Medium - Important for fraud prevention

---

### 7. Audit Log Viewing

**Current State:** ⚠️ Logs exist in database but no API to view

**What's Missing:**
- View all admin actions on bonuses
- Filter audit logs by admin user, action type, date
- Track who created/updated/deleted bonus plans
- Track manual bonus grants and forfeits

**Recommended Endpoint:**

```typescript
GET /api/admin/bonus/audit-log
Query params: ?admin_user_id=1&action_type=bonus_granted&limit=100&offset=0

Response:
{
  "success": true,
  "data": [
    {
      "id": 1001,
      "admin_user_id": 1,
      "admin_username": "admin@example.com",
      "action_type": "manual_bonus_granted",
      "action_description": "Manual bonus granted to player 789",
      "bonus_plan_id": 456,
      "player_id": 789,
      "old_value": null,
      "new_value": {
        "bonus_amount": 500.00,
        "notes": "VIP compensation"
      },
      "ip_address": "192.168.1.1",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 5000,
    "limit": 100,
    "offset": 0
  }
}
```

**Business Impact:** Medium - Important for compliance and auditing

---

### 8. Automated Bonus Rules

**Current State:** ❌ Not implemented

**What's Missing:**
- Auto-forfeit bonuses after X days of inactivity
- Auto-expire bonuses on specific conditions
- Scheduled bonus activations
- Auto-grant based on player activity triggers

**Recommended Structure:**

```typescript
// Create automation rule
POST /api/admin/bonus/automation-rules
{
  "rule_type": "auto_forfeit",
  "condition": {
    "inactivity_days": 7
  },
  "action": {
    "forfeit_reason": "Auto-forfeited due to inactivity"
  },
  "is_active": true
}
```

**Business Impact:** Medium - Reduces manual admin work

---

### 9. Bonus Templates

**Current State:** ❌ Not implemented

**What's Missing:**
- Save bonus plan configurations as templates
- Load templates when creating new plans
- Share templates across brands

**Recommended Endpoints:**

```typescript
// Save as template
POST /api/admin/bonus/plans/:id/save-template
{
  "template_name": "Standard Welcome Bonus 100%",
  "is_shared": true
}

// List templates
GET /api/admin/bonus/templates

// Create from template
POST /api/admin/bonus/plans/from-template
{
  "template_id": 5,
  "overrides": {
    "name": "New Year Welcome Bonus",
    "start_date": "2025-01-01",
    "end_date": "2025-01-31"
  }
}
```

**Business Impact:** Low - Quality of life improvement

---

### 10. Export & Reporting

**Current State:** ❌ Not implemented

**What's Missing:**
- Export bonus plans to CSV/Excel
- Export player bonuses to CSV
- Generate PDF reports
- Scheduled email reports

**Recommended Endpoints:**

```typescript
// Export bonus plans
GET /api/admin/bonus/plans/export?format=csv&status=active

// Export player bonuses
GET /api/admin/bonus/player/:playerId/bonuses/export?format=excel

// Generate report
POST /api/admin/bonus/reports/generate
{
  "report_type": "monthly_summary",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "email_to": "reports@example.com"
}
```

**Business Impact:** Medium - Important for reporting to management

---

## 📊 Priority Recommendation

### 🔴 Implement First (Critical)
1. **Bulk Operations** - Saves significant admin time
2. **Detailed Analytics** - Critical for business decisions
3. **Bonus Transactions (Admin View)** - Needed for support

### 🟡 Implement Second (Nice-to-Have)
4. **Audit Log Viewing** - Important for compliance
5. **Player Restrictions** - Needed for fraud prevention
6. **Bonus Plan Cloning** - Improves efficiency

### 🟢 Implement Later (Low Priority)
7. **Advanced Search** - Quality of life
8. **Automated Rules** - Reduces manual work
9. **Templates** - Convenience feature
10. **Export/Reporting** - Can be done manually for now

---

## 🛠️ Implementation Notes

### For Backend Developer:

Most of these features can be implemented by:

1. **Extending existing services:**
   - `BonusInstanceService` - Add bulk operations
   - `BonusEngineService` - Add analytics methods
   - `BonusPlanService` - Add cloning, templates

2. **Creating new controllers:**
   - `bonus-analytics.controller.ts` - Analytics endpoints
   - `bonus-audit.controller.ts` - Audit log viewing
   - `bonus-bulk.controller.ts` - Bulk operations

3. **Database queries:**
   - Most features just need new SQL queries
   - Audit log table already exists (`bonus_audit_log`)
   - May need new tables for: templates, restrictions, automation rules

4. **Minimal code changes:**
   - Most endpoints follow existing patterns
   - Use existing services and utilities
   - Add new routes in `bonus.routes.ts`

---

## ✅ Summary

**Total Missing Features:** 10

**Current Implementation:**
- ✅ Basic CRUD for bonus plans
- ✅ Manual granting
- ✅ Forfeit bonuses
- ✅ Basic statistics
- ✅ Game contributions

**Missing But Recommended:**
- ❌ Bulk operations (critical)
- ❌ Detailed analytics (critical)
- ❌ Transaction viewing (critical)
- ❌ Audit log API
- ❌ Player restrictions
- ❌ Advanced filtering
- ❌ Automation rules
- ❌ Templates
- ❌ Cloning
- ❌ Export/Reporting

**Recommendation:** Prioritize the 3 critical features first, then add others based on business needs.

---

**Document Version:** 1.0
**Last Updated:** 2025-01-26
**Status:** 📋 Feature Recommendations
