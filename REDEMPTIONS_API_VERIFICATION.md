# Redemptions Page API Verification Report

**Date**: 2025-11-30
**Endpoint**: GET /api/admin/affiliate-redemptions
**Frontend Path**: /dashboard/affiliates/redemptions
**Status**: ⚠️ **NEEDS FRONTEND FIXES**

---

## API Endpoint Verification

### Endpoint: GET /api/admin/affiliate-redemptions
**Status**: ✅ Exists and working
**Location**: `src/routes/admin-affiliate.routes.ts:570`
**Controller**: `getAllRedemptions` in `affiliate-admin.controller.ts`
**Service**: `AffiliateBalanceService.getAllRedemptions()`

---

## Query Parameters ✅

| Frontend Param | Backend Param | Type | Status |
|----------------|---------------|------|--------|
| `page` | `page` | number | ✅ Match |
| `limit` | `limit` | number | ✅ Match |
| `status` | `status` | string | ✅ Match |
| `userId` | `userId` | number | ✅ Match |

**Backend Default Values**:
- `page`: 1
- `limit`: 50

---

## Response Structure ⚠️

### Frontend Expects:
```typescript
{
  success: true,
  data: {
    redemptions: Redemption[],
    total: number,
    limit: number,  // ❌ DOES NOT EXIST
    // Frontend calculates totalPages from total and limit
  }
}
```

### Backend Returns:
```typescript
{
  success: true,
  data: {
    redemptions: Redemption[],
    total: number,
    page: number,
    totalPages: number  // ✅ Already calculated
  }
}
```

### ⚠️ Issue Found: Pagination Calculation

**Frontend Code**:
```typescript
setTotalPages(
  Math.ceil((data.data.total || 0) / (data.data.limit || 50)),
);
```

**Problem**:
- Frontend tries to calculate `totalPages` using `data.data.limit` which doesn't exist
- Falls back to `50` but actual limit might be different
- Backend already returns `totalPages` correctly calculated

**Fix**: Frontend should use `data.data.totalPages` directly:
```typescript
setTotalPages(data.data.totalPages || 1);
```

---

## Redemption Object Fields ✅

### Frontend Interface:
```typescript
interface Redemption {
  id: number;
  user_id: number;
  total_amount: number;      // ⚠️ Will be STRING from backend
  instant_amount: number;    // ⚠️ Will be STRING from backend
  locked_amount: number;     // ⚠️ Will be STRING from backend
  instant_status: string;
  locked_status: string;
  unlock_date: string | null;
  unlocked_at: string | null;
  instant_transaction_id: number | null;
  unlock_transaction_id: number | null;
  created_at: string;
  username: string;
  email: string;
  referral_code: string;
  affiliate_name: string;
}
```

### Backend Returns (SQL Query):

**From `affiliate_redemptions` table (ar.*)**:
- `id` ✅ number
- `user_id` ✅ number
- `total_amount` ✅ **numeric(20,2)** → Returns as STRING
- `instant_amount` ✅ **numeric(20,2)** → Returns as STRING
- `locked_amount` ✅ **numeric(20,2)** → Returns as STRING
- `instant_status` ✅ string
- `locked_status` ✅ string
- `unlock_date` ✅ timestamp | null
- `unlocked_at` ✅ timestamp | null
- `instant_transaction_id` ✅ number | null
- `unlock_transaction_id` ✅ number | null
- `created_at` ✅ timestamp
- Plus: notes, admin_notes, cancelled_by, cancelled_at, etc. (extra fields)

**From JOINs**:
- `u.username` ✅ string
- `u.email` ✅ string
- `ap.referral_code` ✅ string
- `ap.display_name as affiliate_name` ✅ string

**All required fields are present** ✅

---

## Critical Issue: String to Number Conversion ❌

### Problem 1: Statistics Calculation

**Frontend Code**:
```typescript
const calculateStats = () => {
  const totalRedemptions = redemptions.length;
  const totalAmount = redemptions.reduce(
    (sum, r) => sum + r.total_amount,  // ❌ STRING CONCATENATION!
    0,
  );
  const lockedAmount = redemptions.reduce(
    (sum, r) => (r.locked_status === "locked" ? sum + r.locked_amount : sum),  // ❌ STRING!
    0,
  );
  const instantAmount = redemptions.reduce(
    (sum, r) => sum + r.instant_amount,  // ❌ STRING!
    0,
  );
  // ...
};
```

**Issue**: PostgreSQL `numeric(20,2)` fields return as **strings** (e.g., `"150.00"`), causing:
- `0 + "150.00" + "200.00" = "0150.00200.00"` ❌ (string concatenation)
- Should be: `0 + 150.00 + 200.00 = 350.00` ✅

### Problem 2: Display Values

**Frontend Code**:
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Used as:
formatCurrency(redemption.total_amount)  // ❌ Receives STRING!
```

**Issue**: `formatCurrency` expects a number but receives a string from backend

---

## Database Schema

```sql
CREATE TABLE affiliate_redemptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total_amount NUMERIC(20,2) NOT NULL,      -- ⚠️ Returns as string
  instant_amount NUMERIC(20,2) NOT NULL,    -- ⚠️ Returns as string
  locked_amount NUMERIC(20,2) NOT NULL,     -- ⚠️ Returns as string
  instant_status VARCHAR(20) DEFAULT 'completed',
  locked_status VARCHAR(20) DEFAULT 'locked',
  unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  instant_transaction_id INTEGER REFERENCES transactions(id),
  unlock_transaction_id INTEGER REFERENCES transactions(id),
  instant_aff_transaction_id INTEGER REFERENCES affiliate_balance_transactions(id),
  unlock_aff_transaction_id INTEGER REFERENCES affiliate_balance_transactions(id),
  notes TEXT,
  admin_notes TEXT,
  cancelled_by INTEGER REFERENCES users(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_by INTEGER DEFAULT 1
);
```

**Constraints**:
- `instant_status` ∈ ['completed', 'failed', 'cancelled']
- `locked_status` ∈ ['locked', 'unlocked', 'cancelled']

---

## Sample Response (Empty Database)

```json
{
  "success": true,
  "data": {
    "redemptions": [],
    "total": 0,
    "page": 1,
    "totalPages": 0
  }
}
```

### Sample Response (With Data)
```json
{
  "success": true,
  "data": {
    "redemptions": [
      {
        "id": 1,
        "user_id": 48,
        "total_amount": "250.00",           // ⚠️ STRING
        "instant_amount": "125.00",         // ⚠️ STRING
        "locked_amount": "125.00",          // ⚠️ STRING
        "instant_status": "completed",
        "locked_status": "locked",
        "unlock_date": "2025-12-30T10:00:00.000Z",
        "unlocked_at": null,
        "instant_transaction_id": 1234,
        "unlock_transaction_id": null,
        "instant_aff_transaction_id": 5678,
        "unlock_aff_transaction_id": null,
        "notes": "Redemption request",
        "admin_notes": null,
        "cancelled_by": null,
        "cancelled_at": null,
        "cancellation_reason": null,
        "created_at": "2025-11-30T08:15:22.133Z",
        "updated_at": "2025-11-30T08:15:22.133Z",
        "created_by": 1,
        "updated_by": 1,
        "username": "player50",
        "email": "player50@gmail.com",
        "referral_code": "AFFPLAYER50",
        "affiliate_name": "Player50 Affiliate"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

---

## Required Frontend Fixes

### Fix 1: Add parseNumeric Helper

Add this helper function at the top of the component:

```typescript
// Helper to parse backend numeric strings to numbers
const parseNumeric = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};
```

### Fix 2: Update calculateStats Function

Replace the `calculateStats` function with:

```typescript
const calculateStats = () => {
  const totalRedemptions = redemptions.length;
  const totalAmount = redemptions.reduce(
    (sum, r) => sum + parseNumeric(r.total_amount),  // ✅ PARSE TO NUMBER
    0,
  );
  const lockedAmount = redemptions.reduce(
    (sum, r) => (r.locked_status === "locked" ? sum + parseNumeric(r.locked_amount) : sum),  // ✅ PARSE
    0,
  );
  const instantAmount = redemptions.reduce(
    (sum, r) => sum + parseNumeric(r.instant_amount),  // ✅ PARSE
    0,
  );

  return {
    totalRedemptions,
    totalAmount,
    lockedAmount,
    instantAmount,
  };
};
```

### Fix 3: Update formatCurrency Calls in Table

Wrap all currency display values with parseNumeric:

```typescript
// In the table cells:
formatCurrency(parseNumeric(redemption.total_amount))
formatCurrency(parseNumeric(redemption.instant_amount))
formatCurrency(parseNumeric(redemption.locked_amount))
```

### Fix 4: Fix Pagination

Update the totalPages calculation:

```typescript
// CHANGE FROM:
setTotalPages(
  Math.ceil((data.data.total || 0) / (data.data.limit || 50)),
);

// CHANGE TO:
setTotalPages(data.data.totalPages || 1);
```

---

## Frontend Code Issues Summary

### ❌ Issues Found:

1. **Pagination Calculation** - Uses non-existent `data.data.limit` field
2. **Statistics Calculation** - String concatenation instead of addition
3. **Currency Formatting** - Passes strings to formatCurrency expecting numbers

### ✅ What Works:

- API endpoint exists and is correctly routed
- All required fields are returned from backend
- Filtering by status and userId works
- Pagination works (just needs frontend fix)
- All field names match between frontend and backend

---

## Complete Frontend Fix Instructions

### Summary of Changes:

1. **Add parseNumeric helper** (same as other pages)
2. **Update calculateStats** to parse numeric strings
3. **Update formatCurrency calls** in table to parse values
4. **Fix totalPages** to use backend value directly

### Testing After Fixes:

1. Stats cards should show `$0.00` for empty data (not `$NaN` or `$0`)
2. When data exists, currency values should display correctly
3. Pagination should work correctly with backend-provided totalPages
4. All filters should work (status, userId, search)

---

## Backend Summary

✅ **Endpoint exists and working**
✅ **All fields returned correctly**
✅ **Pagination calculated on backend**
✅ **Filtering implemented (status, userId)**
✅ **Joins with users and affiliate_profiles for complete data**

**No backend changes needed** - All issues are frontend-only.

---

## Status

**Backend**: ✅ **100% READY**
**Frontend**: ⚠️ **NEEDS 4 FIXES**
**Priority**: 🟡 **MEDIUM** - Page will load but show incorrect calculations

---

## Recommended Implementation

1. Add `parseNumeric` helper ← 1 minute
2. Update `calculateStats` function ← 2 minutes
3. Update table `formatCurrency` calls ← 2 minutes
4. Fix `totalPages` calculation ← 1 minute

**Total Time**: ~5 minutes

The page will then display all data correctly with proper currency formatting and statistics.
