# Admin Affiliate System API Reference

Complete API documentation for all admin panel endpoints for the enhanced affiliate system.

## 🔐 Authentication

All endpoints require:
- **Header**: `Authorization: Bearer <admin_token>`
- **Role**: `Admin` or `Manager`

---

## 📊 Dashboard & Statistics

### Get Affiliate Dashboard
Get comprehensive dashboard statistics.

```http
GET /api/admin/affiliate-dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_affiliates": 150,
      "active_affiliates": 120,
      "total_referrals": 3500,
      "pending_commissions_amount": 15000.50,
      "pending_commissions_count": 45,
      "approved_commissions_amount": 50000.00,
      "paid_commissions_amount": 100000.00,
      "total_affiliate_balance": 25000.00,
      "total_locked_balance": 10000.00
    },
    "applicationStats": {
      "pending_count": 12,
      "approved_count": 145,
      "rejected_count": 23,
      "pending_last_7_days": 5,
      "approved_last_7_days": 8,
      "total_last_30_days": 35
    },
    "topAffiliates": [ /* top 10 by earnings */ ],
    "recentRedemptions": [ /* last 10 redemptions */ ]
  }
}
```

---

## 📝 Application Management

### 1. Get All Applications

```http
GET /api/admin/affiliate-applications
```

**Query Parameters:**
- `status` (optional): `pending`, `approved`, `rejected`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name, username, email
- `sortBy` (optional): `created_at`, `display_name`, `expected_monthly_referrals` (default: `created_at`)
- `sortOrder` (optional): `ASC`, `DESC` (default: `DESC`)

**Example:**
```http
GET /api/admin/affiliate-applications?status=pending&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": 1,
        "user_id": 123,
        "application_status": "pending",
        "display_name": "Alice Marketing",
        "website_url": "https://alicereviews.com",
        "social_media_links": {"instagram": "@alicereviews"},
        "traffic_sources": ["Instagram", "YouTube"],
        "expected_monthly_referrals": 50,
        "marketing_experience": "5 years of affiliate marketing...",
        "additional_info": "I specialize in casino reviews...",
        "preferred_referral_code": "ALICE789",
        "upline_referral_code": "JOHN123",
        "created_at": "2024-01-15T10:30:00Z",
        "username": "alice_user",
        "email": "alice@example.com",
        "first_name": "Alice",
        "last_name": "Smith",
        "country": "USA"
      }
    ],
    "total": 12,
    "page": 1,
    "totalPages": 1
  }
}
```

### 2. Get Application Statistics

```http
GET /api/admin/affiliate-applications/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending_count": 12,
    "approved_count": 145,
    "rejected_count": 23,
    "pending_last_7_days": 5,
    "approved_last_7_days": 8,
    "total_last_30_days": 35
  }
}
```

### 3. Get Application by ID

```http
GET /api/admin/affiliate-applications/:id
```

**Example:**
```http
GET /api/admin/affiliate-applications/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 123,
    "application_status": "pending",
    "display_name": "Alice Marketing",
    /* ... all application fields ... */
    "upline_code": "JOHN123",
    "upline_name": "John Doe Marketing",
    "upline_user_id": 456
  }
}
```

### 4. Approve Application

```http
POST /api/admin/affiliate-applications/:id/approve
```

**Request Body:**
```json
{
  "commissionRate": 5.0,
  "teamId": 1,
  "managerId": 10,
  "adminNotes": "Excellent application, approved immediately"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application approved successfully",
  "data": {
    "application": { /* application details */ },
    "profile": {
      "id": 50,
      "user_id": 123,
      "referral_code": "ALICE789",
      "display_name": "Alice Marketing",
      "commission_rate": 5.0,
      "is_active": true,
      "level": 2,
      "upline_id": 456,
      "approved_at": "2024-01-20T14:30:00Z",
      "approved_by": 1
    }
  }
}
```

**What happens:**
- Creates `affiliate_profiles` record
- Assigns "Affiliate" role to user
- Links to upline if `upline_referral_code` was provided
- Updates upline's downline count
- Sends approval email to user

### 5. Reject Application

```http
POST /api/admin/affiliate-applications/:id/reject
```

**Request Body:**
```json
{
  "rejectionReason": "Insufficient marketing experience",
  "adminNotes": "Needs at least 1 year of experience"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application rejected",
  "data": {
    "id": 1,
    "application_status": "rejected",
    "reviewed_by": 1,
    "reviewed_at": "2024-01-20T14:35:00Z",
    "rejection_reason": "Insufficient marketing experience",
    "admin_notes": "Needs at least 1 year of experience"
  }
}
```

---

## 👥 Affiliate Management

### 1. Get All Affiliates

```http
GET /api/admin/affiliates
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): `active`, `inactive`
- `teamId` (optional): Filter by team ID
- `search` (optional): Search by name, code, username, email
- `sortBy` (optional): `created_at`, `total_referrals`, `total_commission_earned`, `display_name`
- `sortOrder` (optional): `ASC`, `DESC`

**Example:**
```http
GET /api/admin/affiliates?status=active&page=1&limit=20&sortBy=total_commission_earned&sortOrder=DESC
```

**Response:**
```json
{
  "success": true,
  "data": {
    "affiliates": [
      {
        "id": 50,
        "user_id": 123,
        "referral_code": "ALICE789",
        "display_name": "Alice Marketing",
        "is_active": true,
        "total_referrals": 85,
        "total_commission_earned": 12500.00,
        "commission_rate": 5.0,
        "username": "alice_user",
        "email": "alice@example.com",
        "affiliate_balance": 1500.00,
        "affiliate_balance_locked": 500.00,
        "affiliate_total_earned": 12500.00,
        "affiliate_total_redeemed": 11000.00,
        "commission_count": 340,
        "pending_commissions": 250.50,
        "team_name": "Team Alpha",
        "manager_username": "manager_john",
        "created_at": "2024-01-20T14:30:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

### 2. Get Affiliate Details

```http
GET /api/admin/affiliates/:id
```

**Example:**
```http
GET /api/admin/affiliates/50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 50,
    "user_id": 123,
    "referral_code": "ALICE789",
    "display_name": "Alice Marketing",
    /* ... all affiliate profile fields ... */
    "referral_stats": {
      "total_referrals": 85,
      "referrals_last_30_days": 12,
      "deposited_referrals": 68
    },
    "upline_referral_code": "JOHN123",
    "upline_name": "John Doe Marketing",
    "approved_by_username": "admin_user"
  }
}
```

### 3. Update Affiliate

```http
PUT /api/admin/affiliates/:id
```

**Request Body:**
```json
{
  "displayName": "Alice Marketing Pro",
  "commissionRate": 6.5,
  "minimumPayout": 100.00,
  "isActive": true,
  "managerId": 10,
  "teamId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Affiliate updated successfully",
  "data": { /* updated affiliate profile */ }
}
```

---

## 💰 Balance Management

### 1. Get Affiliate Balance

```http
GET /api/admin/affiliates/:id/balance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "affiliate_balance": 1500.00,
    "affiliate_balance_locked": 500.00,
    "affiliate_total_earned": 12500.00,
    "affiliate_total_redeemed": 11000.00,
    "pending_commissions": 250.50,
    "approved_commissions": 0,
    "total_referrals": 85
  }
}
```

### 2. Adjust Affiliate Balance

```http
POST /api/admin/affiliates/:id/balance/adjust
```

**Request Body:**
```json
{
  "amount": 100.00,
  "description": "Bonus for top performer"
}
```

**For deduction:**
```json
{
  "amount": -50.00,
  "description": "Adjustment for refunded commission"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Balance adjusted successfully",
  "data": {
    "id": 123,
    "user_id": 123,
    "transaction_type": "adjustment",
    "amount": 100.00,
    "balance_before": 1500.00,
    "balance_after": 1600.00,
    "description": "Bonus for top performer",
    "created_at": "2024-01-25T10:00:00Z",
    "created_by": 1
  }
}
```

### 3. Get Balance History

```http
GET /api/admin/affiliates/:id/balance-history
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `transactionType` (optional): `commission_earned`, `redemption_instant`, `redemption_unlocked`, `adjustment`

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 456,
        "user_id": 123,
        "transaction_type": "commission_earned",
        "amount": 50.00,
        "balance_before": 1450.00,
        "balance_after": 1500.00,
        "description": "Commission approved: deposit",
        "commission_id": 789,
        "commission_type": "deposit",
        "commission_base_amount": 1000.00,
        "created_at": "2024-01-24T15:30:00Z"
      },
      {
        "id": 455,
        "transaction_type": "redemption_instant",
        "amount": 500.00,
        "balance_before": 1950.00,
        "balance_after": 1450.00,
        "redemption_id": 12,
        "redemption_total_amount": 1000.00,
        "created_at": "2024-01-23T12:00:00Z"
      }
    ],
    "total": 340,
    "page": 1,
    "totalPages": 7
  }
}
```

---

## 💸 Commission Management

### 1. Get Affiliate Commissions

```http
GET /api/admin/affiliates/:id/commissions
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page (default: 50)
- `status` (optional): `pending`, `approved`, `paid`, `cancelled`

**Response:**
```json
{
  "success": true,
  "data": {
    "commissions": [
      {
        "id": 789,
        "affiliate_id": 123,
        "referred_user_id": 456,
        "transaction_id": 1000,
        "commission_amount": 50.00,
        "commission_rate": 5.0,
        "base_amount": 1000.00,
        "commission_type": "deposit",
        "level": 1,
        "status": "pending",
        "created_at": "2024-01-24T15:00:00Z",
        "referred_username": "bob_player",
        "referred_email": "bob@example.com",
        "transaction_type": "deposit",
        "transaction_amount": 1000.00
      }
    ],
    "pagination": {
      "total": 340,
      "page": 1,
      "limit": 50,
      "totalPages": 7
    }
  }
}
```

### 2. Approve Commission

```http
POST /api/admin/commissions/:commissionId/approve
```

**Example:**
```http
POST /api/admin/commissions/789/approve
```

**Response:**
```json
{
  "success": true,
  "message": "Commission approved successfully"
}
```

**What happens:**
- Updates commission status to `approved`
- Adds commission amount to affiliate balance
- Creates balance transaction record

### 3. Approve Bulk Commissions

```http
POST /api/admin/commissions/approve-bulk
```

**Request Body:**
```json
{
  "commissionIds": [789, 790, 791, 792, 793]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Approved 4 commissions, 1 failed",
  "data": {
    "successCount": 4,
    "failCount": 1
  }
}
```

---

## 🔓 Redemption Management

### Get All Redemptions

```http
GET /api/admin/affiliate-redemptions
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page (default: 50)
- `status` (optional): `locked`, `unlocked`, `cancelled`
- `userId` (optional): Filter by specific user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "redemptions": [
      {
        "id": 12,
        "user_id": 123,
        "total_amount": 1000.00,
        "instant_amount": 500.00,
        "locked_amount": 500.00,
        "instant_status": "completed",
        "locked_status": "locked",
        "unlock_date": "2024-02-01T12:00:00Z",
        "unlocked_at": null,
        "instant_transaction_id": 2000,
        "unlock_transaction_id": null,
        "created_at": "2024-01-25T12:00:00Z",
        "username": "alice_user",
        "email": "alice@example.com",
        "referral_code": "ALICE789",
        "affiliate_name": "Alice Marketing"
      }
    ],
    "total": 50,
    "page": 1,
    "totalPages": 1
  }
}
```

---

## ⚙️ Settings Management

### 1. Get Affiliate Settings

```http
GET /api/admin/affiliate-settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "commission_rates": {
      "level_1": 5.0,
      "level_2": 2.0,
      "level_3": 1.0,
      "deposit": 10.0,
      "bet_revenue": 3.0,
      "loss": 5.0
    },
    "redemption_settings": {
      "minimum_redemption": 10.00,
      "instant_percentage": 50,
      "lock_days": 7,
      "auto_unlock_enabled": true
    },
    "application_settings": {
      "auto_approve_enabled": false,
      "auto_approve_threshold_referrals": 0,
      "require_website": false,
      "require_social_media": false,
      "min_marketing_experience_length": 50
    },
    "commission_approval_settings": {
      "auto_approve_enabled": false,
      "auto_approve_threshold": 10.00,
      "auto_approve_delay_hours": 24,
      "require_manual_review_above": 100.00
    },
    "mlm_settings": {
      "enabled": true,
      "max_levels": 3,
      "allow_self_referrals": false,
      "check_duplicate_ips": true
    }
  }
}
```

### 2. Update Affiliate Settings

```http
PUT /api/admin/affiliate-settings
```

**Request Body:**
```json
{
  "settingKey": "commission_rates",
  "settingValue": {
    "level_1": 6.0,
    "level_2": 2.5,
    "level_3": 1.5,
    "deposit": 12.0,
    "bet_revenue": 4.0,
    "loss": 6.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "id": 1,
    "setting_key": "commission_rates",
    "setting_value": { /* updated values */ },
    "updated_at": "2024-01-25T16:00:00Z",
    "updated_by": 1
  }
}
```

---

## 🔍 Example Use Cases

### Use Case 1: Review and Approve Pending Applications

```bash
# 1. Get all pending applications
GET /api/admin/affiliate-applications?status=pending

# 2. View specific application details
GET /api/admin/affiliate-applications/1

# 3. Approve application
POST /api/admin/affiliate-applications/1/approve
{
  "commissionRate": 5.0,
  "teamId": 1,
  "adminNotes": "Approved - good track record"
}
```

### Use Case 2: Monitor Top Affiliates

```bash
# 1. Get dashboard overview
GET /api/admin/affiliate-dashboard

# 2. Get top affiliates by earnings
GET /api/admin/affiliates?sortBy=total_commission_earned&sortOrder=DESC&limit=10

# 3. View specific affiliate details
GET /api/admin/affiliates/50

# 4. View their commissions
GET /api/admin/affiliates/50/commissions?status=pending
```

### Use Case 3: Process Commission Approvals

```bash
# 1. Get affiliate's pending commissions
GET /api/admin/affiliates/50/commissions?status=pending

# 2. Bulk approve small commissions
POST /api/admin/commissions/approve-bulk
{
  "commissionIds": [789, 790, 791, 792]
}

# 3. Check updated balance
GET /api/admin/affiliates/50/balance
```

### Use Case 4: Manage Redemptions

```bash
# 1. Get all locked redemptions
GET /api/admin/affiliate-redemptions?status=locked

# 2. View redemption history for affiliate
GET /api/admin/affiliates/50/balance-history?transactionType=redemption_instant
```

---

## 🚨 Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 📝 Notes

1. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters
2. **Filtering**: Most endpoints support filtering via query parameters
3. **Sorting**: List endpoints support `sortBy` and `sortOrder`
4. **Timestamps**: All timestamps are in ISO 8601 format (UTC)
5. **Amounts**: All monetary amounts are in the affiliate's currency (default: USD)
6. **Authorization**: Some endpoints require `Admin` role specifically (marked with "Admin only")

---

**For frontend integration examples, see `AFFILIATE_SYSTEM_ENHANCEMENT_PLAN.md`**
