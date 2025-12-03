# Redemption Approval System Analysis

**Date**: 2025-11-30
**Status**: ❌ **MANUAL APPROVAL SYSTEM DOES NOT EXIST**

---

## Current System Behavior

### How Redemptions Currently Work

The affiliate redemption system is **FULLY AUTOMATIC** with NO manual approval:

1. **User Requests Redemption**:
   - Service: `AffiliateBalanceService.processRedemption(userId, amount)`
   - Immediately transfers funds (no approval needed)
   - instant_percentage (default 50%) → Main wallet instantly
   - Remaining amount → Locked for X days (default 7 days)

2. **Instant Status**:
   - Always set to `'completed'` immediately
   - No pending or approval step

3. **Locked Status**:
   - Set to `'locked'` immediately
   - Automatically unlocked by cron job after lock period

---

## Database Schema ✅

**Table**: `affiliate_redemptions`

### Key Status Fields

| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| instant_status | VARCHAR(20) | 'completed', 'failed', 'cancelled' | 'completed' |
| locked_status | VARCHAR(20) | 'locked', 'unlocked', 'cancelled' | 'locked' |

### Admin Action Fields

| Field | Type | Purpose |
|-------|------|---------|
| admin_notes | TEXT | Notes from admin when processing |
| cancelled_by | INTEGER | User ID of admin who cancelled |
| cancelled_at | TIMESTAMP | When it was cancelled |
| cancellation_reason | TEXT | Why it was cancelled |

### Constraints

```sql
CHECK (instant_status IN ('completed', 'failed', 'cancelled'))
CHECK (locked_status IN ('locked', 'unlocked', 'cancelled'))
```

**Problem**: ❌ **NO 'pending' OR 'rejected' STATUS EXISTS**

---

## Current Endpoints

### 1. GET /api/admin/affiliate-redemptions ✅

**What it does**: Lists all redemptions (view only)
- Controller: `getAllRedemptions` (line 808-826)
- Service: `AffiliateBalanceService.getAllRedemptions()`
- Returns: Redemption history with pagination

**What it CANNOT do**:
- ❌ Cannot approve redemptions
- ❌ Cannot reject redemptions
- ❌ Cannot change status

---

## Missing Functionality

### ❌ 1. Pending Status System

**Current Behavior**: Redemptions are auto-processed
**Needed**: Redemptions should start as 'pending' and wait for admin action

**Required Changes**:
1. Add 'pending' to instant_status constraint
2. Add 'rejected' to instant_status constraint
3. Modify redemption creation to use status='pending' instead of auto-processing

---

### ❌ 2. Approve/Accept Redemption Endpoint

**What's Needed**: `POST /api/admin/affiliate-redemptions/:id/approve`

**Should Do**:
1. Verify redemption exists and status is 'pending'
2. Process the redemption (transfer funds)
3. Update instant_status to 'completed'
4. Update locked_status to 'locked'
5. Create transaction records
6. Update user balances
7. Record admin_notes
8. Track processed_by admin ID

**Current Status**: ❌ **DOES NOT EXIST**

---

### ❌ 3. Reject/Decline Redemption Endpoint

**What's Needed**: `POST /api/admin/affiliate-redemptions/:id/reject`

**Should Do**:
1. Verify redemption exists and status is 'pending'
2. Update instant_status to 'rejected' (or use 'cancelled')
3. Restore affiliate balance to user (refund the locked amount)
4. Record cancellation_reason from admin
5. Set cancelled_by to admin user ID
6. Set cancelled_at to current timestamp
7. Add admin_notes

**Current Status**: ❌ **DOES NOT EXIST**

---

### ❌ 4. Request Redemption Endpoint (Modified)

**Current**: Auto-processes redemptions immediately
**Needed**: Create pending redemption request for admin review

**Should Do**:
1. Validate user has sufficient balance
2. Create redemption record with instant_status='pending'
3. Lock the requested amount in affiliate_balance_locked
4. Do NOT transfer to main wallet yet
5. Wait for admin approval

**Current Status**: ❌ **AUTO-PROCESSES, NO PENDING STATE**

---

## What Needs to Be Implemented

### High-Level Implementation Plan

#### 1. Database Changes

**Add new status values**:
```sql
ALTER TABLE affiliate_redemptions
DROP CONSTRAINT affiliate_redemptions_instant_status_check;

ALTER TABLE affiliate_redemptions
ADD CONSTRAINT affiliate_redemptions_instant_status_check
CHECK (instant_status IN ('pending', 'completed', 'failed', 'cancelled', 'rejected'));
```

**Add admin tracking fields** (already exist ✅):
- admin_notes
- cancelled_by
- cancelled_at
- cancellation_reason

**Add processed tracking**:
```sql
ALTER TABLE affiliate_redemptions
ADD COLUMN processed_by INTEGER REFERENCES users(id),
ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT;
```

---

#### 2. Create Service Methods

**File**: `src/services/affiliate/affiliate-balance.service.ts`

##### Method: `requestRedemption(userId, amount, notes?)`
```typescript
static async requestRedemption(userId: number, amount: number, notes?: string) {
  // Create pending redemption request
  // Lock affiliate balance
  // Do NOT transfer funds yet
  // Return redemption ID
}
```

##### Method: `approveRedemption(redemptionId, adminId, adminNotes?)`
```typescript
static async approveRedemption(redemptionId: number, adminId: number, adminNotes?: string) {
  // Verify status is 'pending'
  // Process the redemption (transfer funds)
  // Update status to 'completed'
  // Track admin action
}
```

##### Method: `rejectRedemption(redemptionId, adminId, reason)`
```typescript
static async rejectRedemption(redemptionId: number, adminId: number, reason: string) {
  // Verify status is 'pending'
  // Restore locked balance to available balance
  // Update status to 'rejected'
  // Record rejection reason
  // Track admin action
}
```

---

#### 3. Create Controller Functions

**File**: `src/api/admin/affiliate-admin.controller.ts`

##### `approveRedemption`
```typescript
export const approveRedemption = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { admin_notes } = req.body;
  const adminId = (req as any).user.userId;

  // Call service
  const result = await AffiliateBalanceService.approveRedemption(
    parseInt(id),
    adminId,
    admin_notes
  );

  // Return success
}
```

##### `rejectRedemption`
```typescript
export const rejectRedemption = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { reason, admin_notes } = req.body;
  const adminId = (req as any).user.userId;

  // Validate reason is provided
  if (!reason) {
    throw new ApiError('Rejection reason is required', 400);
  }

  // Call service
  const result = await AffiliateBalanceService.rejectRedemption(
    parseInt(id),
    adminId,
    reason
  );

  // Return success
}
```

---

#### 4. Register Routes

**File**: `src/routes/admin-affiliate.routes.ts`

```typescript
router.post(
  "/affiliate-redemptions/:id/approve",
  authorize(["Admin"]),
  approveRedemption
);

router.post(
  "/affiliate-redemptions/:id/reject",
  authorize(["Admin"]),
  rejectRedemption
);
```

**Full Paths**:
- `POST /api/admin/affiliate-redemptions/:id/approve`
- `POST /api/admin/affiliate-redemptions/:id/reject`

---

#### 5. User-Facing Route (Optional)

**File**: `src/routes/affiliate.routes.ts`

```typescript
router.post('/redemptions', authenticate, requestRedemption);
```

**Full Path**: `POST /api/affiliate/redemptions`

---

## Frontend Requirements

Once backend is implemented, frontend needs:

### 1. Action Buttons in Redemptions Table

**For Each Pending Redemption**:
```typescript
{redemption.instant_status === 'pending' && (
  <div className="flex gap-2">
    <Button
      onClick={() => handleApprove(redemption.id)}
      variant="default"
      size="sm"
    >
      <CheckCircle className="h-4 w-4 mr-2" />
      Approve
    </Button>
    <Button
      onClick={() => handleReject(redemption.id)}
      variant="destructive"
      size="sm"
    >
      <XCircle className="h-4 w-4 mr-2" />
      Decline
    </Button>
  </div>
)}
```

### 2. Rejection Dialog

```typescript
const handleReject = (redemptionId: number) => {
  // Open dialog to collect rejection reason
  setSelectedRedemption(redemptionId);
  setRejectDialogOpen(true);
};

const submitRejection = async () => {
  await fetch(`/api/admin/affiliate-redemptions/${selectedRedemption}/reject`, {
    method: 'POST',
    body: JSON.stringify({
      reason: rejectionReason,
      admin_notes: adminNotes
    })
  });
};
```

### 3. Status Badge

```typescript
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'completed':
      return <Badge variant="success">Approved</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};
```

---

## Summary

### Current State
- ✅ Database table exists with proper structure
- ✅ Cancellation fields exist (cancelled_by, cancellation_reason, admin_notes)
- ✅ GET endpoint exists for viewing redemptions
- ❌ **NO pending status support**
- ❌ **NO approve endpoint**
- ❌ **NO reject endpoint**
- ❌ **Redemptions auto-process immediately**

### What's Missing
1. ❌ 'pending' and 'rejected' status values in constraint
2. ❌ processed_by and processed_at tracking fields
3. ❌ Service method: `requestRedemption()` (create pending request)
4. ❌ Service method: `approveRedemption()`
5. ❌ Service method: `rejectRedemption()`
6. ❌ Controller: `approveRedemption`
7. ❌ Controller: `rejectRedemption`
8. ❌ Route: `POST /api/admin/affiliate-redemptions/:id/approve`
9. ❌ Route: `POST /api/admin/affiliate-redemptions/:id/reject`

### Recommended Priority
1. **HIGH**: Add approve/reject endpoints (admins need this now)
2. **MEDIUM**: Modify redemption request to create pending requests
3. **LOW**: Add processed_by/processed_at fields for better tracking

---

## Next Steps

**Option 1**: Implement full manual approval system
- Add all missing endpoints
- Modify redemption flow to use pending status
- Update frontend to show approve/reject buttons

**Option 2**: Quick fix - Add cancel endpoint only
- Keep auto-processing
- Add ability to cancel/refund already processed redemptions
- Simpler implementation, less disruption

**Recommendation**: Implement **Option 1** for proper control over redemptions.

---

**Estimated Implementation Time**: 3-4 hours
