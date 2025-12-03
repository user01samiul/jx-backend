# Payouts Page API Verification Report

**Date**: 2025-11-30
**Frontend Path**: /dashboard/affiliates/payouts
**Status**: ❌ **CRITICAL - ALL ENDPOINTS MISSING**

---

## 🚨 Critical Issues Found

### Issue Summary: Complete Payout System Missing from API

**Database**: ✅ Table exists with data (6 payouts)
**Service Layer**: ✅ Functions exist in `affiliate.service.ts`
**Controller Layer**: ❌ **DOES NOT EXIST**
**Routes Layer**: ❌ **DOES NOT EXIST**

The payout functionality is **90% implemented** but has **NO API endpoints** exposed to the frontend.

---

## Missing Endpoints

### 1. GET /api/affiliate/admin/payouts ❌

**Frontend Expects**:
```
GET /api/affiliate/admin/payouts?status=pending&payment_method=bank_transfer&start_date=2025-01-01&end_date=2025-12-31
```

**Backend Has**: ❌ **DOES NOT EXIST**

**Service Function Available**: ✅ `AffiliateService.getAffiliatePayouts()` (but only for specific user)

**Problem**:
- Frontend needs global list of ALL payouts (admin view)
- Service only supports fetching payouts for ONE specific user
- No controller function exists
- No route registered

**Impact**:
- ❌ Admin cannot see any payouts
- ❌ Page will show 404 error
- ❌ Cannot filter or manage payouts

---

### 2. GET /api/affiliate/admin/payouts/stats ❌

**Frontend Expects**:
```
GET /api/affiliate/admin/payouts/stats?start_date=2025-01-01&end_date=2025-12-31
```

**Backend Has**: ❌ **DOES NOT EXIST**

**Problem**: No endpoint to get global payout statistics

**Impact**:
- ❌ Statistics cards will show 0 for everything
- ❌ Cannot see total payouts, pending amounts, etc.
- ❌ Admin has no visibility into payout metrics

---

### 3. GET /api/affiliate/payouts/stats ❌

**Frontend Expects** (for Affiliate role):
```
GET /api/affiliate/payouts/stats
```

**Backend Has**: ❌ **DOES NOT EXIST**

**Problem**: Affiliates cannot see their own payout statistics

**Impact**:
- ❌ Affiliate dashboard shows no payout stats

---

### 4. POST /api/affiliate/payouts ❌

**Frontend Expects**:
```json
POST /api/affiliate/payouts
{
  "amount": 250.00,
  "payment_method": "bank_transfer",
  "notes": "Monthly payout request"
}
```

**Backend Has**: ❌ **NO ROUTE REGISTERED**

**Service Function Available**: ✅ `AffiliateService.requestPayout()`

**Problem**:
- Service function exists but no controller/route
- Affiliates cannot request payouts via API

**Impact**:
- ❌ "Request Payout" button does nothing
- ❌ Affiliates cannot submit payout requests

---

### 5. PUT /api/affiliate/admin/payouts/:id/process ❌

**Frontend Expects**:
```json
PUT /api/affiliate/admin/payouts/123/process
{
  "status": "processing",
  "payment_reference": "TXN-12345",
  "notes": "Payment sent via bank transfer"
}
```

**Backend Has**: ❌ **DOES NOT EXIST**

**Problem**: No endpoint to process/update payout status

**Impact**:
- ❌ Admin cannot approve/reject payouts
- ❌ Cannot mark payouts as completed
- ❌ Cannot add payment references

---

## Database Schema ✅

The `affiliate_payouts` table exists and is properly structured:

```sql
CREATE TABLE affiliate_payouts (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_amount NUMERIC(20,2) NOT NULL,                -- ⚠️ Returns as string
  commission_ids INTEGER[] NOT NULL,
  payment_method VARCHAR(50),
  payment_reference TEXT,
  status VARCHAR(20) DEFAULT 'pending',                -- pending|processing|completed|failed
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);
```

**Current Data**: 6 payouts in database

**Status Values**:
- `pending` - Awaiting admin approval
- `processing` - Admin is processing payment
- `completed` - Payment sent and confirmed
- `failed` - Payment failed

---

## Service Layer Functions ✅

Located in `/src/services/affiliate/affiliate.service.ts`:

### 1. getAffiliatePayouts() ✅
```typescript
static async getAffiliatePayouts(
  userId: number,
  filters: {
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ payouts: AffiliatePayout[]; total: number; pagination: any }>
```

**Limitation**: Only gets payouts for ONE user, not global list

### 2. requestPayout() ✅
```typescript
static async requestPayout(
  userId: number,
  amount: number,
  paymentMethod: string
): Promise<AffiliatePayout>
```

**Exists but unused** - No controller/route exposes this

---

## Frontend Interface Expectations

### Payout Object:
```typescript
interface Payout {
  id: number;
  affiliate_id: number;
  affiliate_name: string;        // ⚠️ NOT in database - needs JOIN
  affiliate_username: string;    // ⚠️ NOT in database - needs JOIN
  total_amount: string;          // ✅ numeric(20,2) → string
  payment_method: string;        // ✅ varchar(50)
  payment_reference?: string;    // ✅ text | null
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";  // ⚠️ No "cancelled" in DB
  notes?: string;                // ✅ text | null
  created_at: string;            // ✅ timestamp
  processed_at?: string;         // ✅ timestamp | null
}
```

**Missing Fields from Database**:
- `affiliate_name` - Need JOIN with `affiliate_profiles.display_name`
- `affiliate_username` - Need JOIN with `users.username`

**Status Mismatch**:
- Frontend expects: `cancelled` status
- Database constraint: Only `pending`, `processing`, `completed`, `failed`
- **Fix needed**: Add `cancelled` to database constraint

---

## What Needs to Be Created 🛠️

### 1. Controller Functions (in `affiliate-admin.controller.ts`)

#### getAllPayouts
```typescript
export const getAllPayouts = async (req: Request, res: Response, next: NextFunction) => {
  // GET /api/admin/affiliate-payouts (note: different from frontend path)
  // OR create at /api/affiliate/admin/payouts to match frontend

  const { page = 1, limit = 50, status, payment_method, start_date, end_date } = req.query;

  // Query with JOINs:
  SELECT
    ap.*,
    aff.display_name as affiliate_name,
    u.username as affiliate_username
  FROM affiliate_payouts ap
  JOIN users u ON ap.affiliate_id = u.id
  LEFT JOIN affiliate_profiles aff ON ap.affiliate_id = aff.user_id
  WHERE ...

  return {
    success: true,
    data: {
      payouts: [...],
      pagination: { page, limit, total, totalPages }
    }
  };
};
```

#### getPayoutStats
```typescript
export const getPayoutStats = async (req: Request, res: Response, next: NextFunction) => {
  // GET /api/affiliate/admin/payouts/stats

  const { start_date, end_date } = req.query;

  // SQL Query:
  SELECT
    COUNT(*)::TEXT as total_payouts,
    COALESCE(SUM(total_amount), 0)::TEXT as total_amount,
    COUNT(*) FILTER (WHERE status = 'pending')::TEXT as pending_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0)::TEXT as pending_amount,
    COUNT(*) FILTER (WHERE status = 'processing')::TEXT as processing_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'processing'), 0)::TEXT as processing_amount,
    COUNT(*) FILTER (WHERE status = 'completed')::TEXT as completed_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0)::TEXT as completed_amount,
    COUNT(*) FILTER (WHERE status = 'failed')::TEXT as failed_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'failed'), 0)::TEXT as failed_amount
  FROM affiliate_payouts
  WHERE ($1::DATE IS NULL OR created_at >= $1)
    AND ($2::DATE IS NULL OR created_at <= $2)
};
```

#### requestPayout (Affiliate endpoint)
```typescript
export const requestPayout = async (req: Request, res: Response, next: NextFunction) => {
  // POST /api/affiliate/payouts
  const userId = req.user.userId;  // From JWT
  const { amount, payment_method, notes } = req.body;

  // Use existing service:
  const payout = await AffiliateService.requestPayout(userId, amount, payment_method);

  return {
    success: true,
    data: payout
  };
};
```

#### processPayout
```typescript
export const processPayout = async (req: Request, res: Response, next: NextFunction) => {
  // PUT /api/affiliate/admin/payouts/:id/process
  const { id } = req.params;
  const { status, payment_reference, notes } = req.body;
  const processedBy = req.user.userId;

  // Update payout:
  UPDATE affiliate_payouts
  SET
    status = $1,
    payment_reference = $2,
    notes = COALESCE($3, notes),
    processed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE processed_at END,
    processed_by = $4,
    updated_at = NOW(),
    updated_by = $4
  WHERE id = $5
};
```

### 2. Routes Registration

**Option A**: Add to `admin-affiliate.routes.ts` (recommended)
```typescript
// Admin routes (different path to match frontend)
router.get("/admin/affiliate-payouts", getAllPayouts);  // Note: /admin/affiliate-payouts
router.get("/admin/affiliate-payouts/stats", getPayoutStats);
router.put("/admin/affiliate-payouts/:id/process", authorize(["Admin"]), processPayout);

// Affiliate routes (for non-admin users)
router.post("/affiliate/payouts", requestPayout);  // Affiliate requests payout
router.get("/affiliate/payouts/stats", getAffiliatePayoutStats);  // Affiliate views own stats
```

**Option B**: Create new route file matching frontend paths
Create `/src/routes/affiliate-payout.routes.ts` with path prefix `/api/affiliate`

### 3. Database Constraint Update

Add `cancelled` status to constraint:

```sql
ALTER TABLE affiliate_payouts
DROP CONSTRAINT affiliate_payouts_status_check;

ALTER TABLE affiliate_payouts
ADD CONSTRAINT affiliate_payouts_status_check
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
```

---

## Implementation Priority

### Must Have (Critical) 🔴

1. **GET /api/affiliate/admin/payouts** - Admin list view
2. **GET /api/affiliate/admin/payouts/stats** - Admin statistics
3. **PUT /api/affiliate/admin/payouts/:id/process** - Process payout

### Should Have 🟡

4. **POST /api/affiliate/payouts** - Affiliate request payout
5. **GET /api/affiliate/payouts/stats** - Affiliate stats
6. **Add 'cancelled' status to database constraint**

---

## Route Path Mismatch Issue ⚠️

**Frontend expects**: `/api/affiliate/admin/payouts`
**Current admin pattern**: `/api/admin/*`

**Solutions**:

### Option 1: Change Frontend (easier)
```typescript
// CHANGE FROM:
const endpoint = "https://backend.jackpotx.net/api/affiliate/admin/payouts";

// CHANGE TO:
const endpoint = "https://backend.jackpotx.net/api/admin/affiliate-payouts";
```

### Option 2: Create Matching Routes (better UX)
Register routes at `/api/affiliate/admin/*` path to match frontend expectations

### Option 3: Add Route Aliases
Register routes at both paths for backward compatibility

---

## Summary

### ❌ What's Missing (Backend)
1. **5 critical endpoints** - None exist
2. **4 controller functions** - Need to be created
3. **Route registrations** - Need to be added
4. **Database constraint** - Missing 'cancelled' status
5. **JOIN queries** - Need affiliate_name and affiliate_username

### ✅ What Exists (Backend)
1. Database table with 6 payouts
2. Service layer functions (partial)
3. Database schema is correct (except status constraint)

### 🛠️ Required Actions

**Backend** (HIGH PRIORITY):
1. Create `getAllPayouts` controller function
2. Create `getPayoutStats` controller function
3. Create `requestPayout` controller function
4. Create `processPayout` controller function
5. Register routes in admin-affiliate.routes.ts or create new route file
6. Update database constraint to include 'cancelled' status
7. Add JOINs to include `affiliate_name` and `affiliate_username`

**Frontend** (OPTIONAL):
1. Change API paths from `/api/affiliate/admin/payouts` to `/api/admin/affiliate-payouts`
   - OR backend can create matching routes

**Estimated Time**: 3-4 hours for complete implementation

---

## Current Status

**Page Status**: ❌ **COMPLETELY NON-FUNCTIONAL** - All endpoints missing
**Priority**: 🔴 **CRITICAL** - Core affiliate feature unusable
**Blocker**: Backend endpoints must be created before frontend can work
**Data**: ✅ Database has 6 payouts ready to display once endpoints exist

---

## Recommendation

**Immediate Action Required**:
1. Create all 5 missing endpoints
2. Update database constraint
3. Test with existing 6 payouts in database
4. Provide frontend update prompt if route paths change

This is the most critical missing feature in the affiliate system - affiliates cannot request payouts and admins cannot manage them without these endpoints.
