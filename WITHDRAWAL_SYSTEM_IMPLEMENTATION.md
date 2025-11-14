# 🎰 Professional Withdrawal System - Complete Implementation

**Date:** November 5, 2025
**Platform:** JackpotX Casino
**Status:** ✅ Backend Implementation Complete

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Backend Services](#backend-services)
4. [API Endpoints](#api-endpoints)
5. [Automated Processing](#automated-processing)
6. [Security Features](#security-features)
7. [Testing Guide](#testing-guide)

---

## 🎯 Overview

A professional-grade withdrawal system designed for a casino platform with the following features:

### ✅ Implemented Features

- **Multi-Method Support**: Crypto (OxaPay integration), Bank Transfer, E-Wallet
- **Auto-Approval System**: Automatic approval for low-risk withdrawals under configurable threshold ($100 default)
- **Manual Approval Workflow**: Admin review for high-risk or large withdrawals
- **Fraud Detection**: Multi-layer security checks with risk scoring
- **Automated Night Processing**: Cron job runs hourly between 22:00-06:00 UTC
- **Comprehensive Validation**: KYC, balance, limits (daily/weekly/monthly), pending withdrawals
- **Complete Audit Trail**: Every action logged with actor, timestamps, and details
- **Configurable Settings**: 18 settings for limits, automation, fees, and security

---

## 🗄️ Database Schema

### 1. `withdrawal_settings` Table

Stores all configurable withdrawal settings.

```sql
CREATE TABLE withdrawal_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**18 Default Settings:**

| Key | Default Value | Description |
|-----|---------------|-------------|
| `min_withdrawal_amount` | `10` | Minimum withdrawal amount (USD) |
| `max_withdrawal_amount` | `50000` | Maximum withdrawal amount (USD) |
| `daily_withdrawal_limit` | `10000` | Daily withdrawal limit per user (USD) |
| `weekly_withdrawal_limit` | `50000` | Weekly withdrawal limit per user (USD) |
| `monthly_withdrawal_limit` | `200000` | Monthly withdrawal limit per user (USD) |
| `max_pending_withdrawals` | `3` | Maximum pending withdrawals per user |
| `auto_approve_enabled` | `true` | Enable automatic approval |
| `auto_approve_threshold` | `100` | Auto-approve amount threshold (USD) |
| `auto_process_enabled` | `true` | Enable automated night processing |
| `auto_process_hours` | `[22,23,0,1,2,3,4,5,6]` | Hours for automated processing (UTC) |
| `require_kyc` | `true` | Require KYC verification |
| `min_account_age_days` | `7` | Minimum account age (days) |
| `min_deposits_required` | `1` | Minimum number of deposits required |
| `withdrawal_fee_percentage` | `0` | Withdrawal fee percentage |
| `min_withdrawal_fee` | `0` | Minimum withdrawal fee (USD) |
| `max_withdrawal_fee` | `50` | Maximum withdrawal fee (USD) |
| `fraud_check_enabled` | `true` | Enable fraud detection |
| `max_risk_score` | `75` | Maximum allowed risk score (0-100) |

### 2. `withdrawal_requests` Table

Stores all withdrawal requests with comprehensive tracking.

```sql
CREATE TABLE withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    crypto_currency VARCHAR(20),
    crypto_address VARCHAR(200),
    crypto_network VARCHAR(50),
    bank_account_number VARCHAR(100),
    bank_routing_number VARCHAR(50),
    bank_name VARCHAR(200),
    ewallet_provider VARCHAR(50),
    ewallet_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejected_by INTEGER REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    processed_at TIMESTAMP,
    gateway_transaction_id VARCHAR(200),
    gateway_response JSON,
    fee_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2),
    ip_address VARCHAR(100),
    user_agent TEXT,
    risk_score INTEGER DEFAULT 0,
    fraud_checks JSON,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status Flow:**
- `pending` → Initial state
- `approved` → Manually approved by admin or auto-approved
- `processing` → Payment being processed through gateway
- `completed` → Successfully processed and sent
- `rejected` → Rejected by admin (amount refunded)
- `cancelled` → Cancelled by user (amount refunded)
- `failed` → Payment gateway failure (amount refunded)

### 3. `withdrawal_audit_log` Table

Complete audit trail for compliance and debugging.

```sql
CREATE TABLE withdrawal_audit_log (
    id SERIAL PRIMARY KEY,
    withdrawal_id INTEGER REFERENCES withdrawal_requests(id),
    action VARCHAR(100) NOT NULL,
    actor_id INTEGER REFERENCES users(id),
    actor_type VARCHAR(50),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Logged Actions:**
- `created`, `approved`, `rejected`, `cancelled`, `processing`, `completed`, `failed`, `refunded`, `cron_batch_processed`, `cron_error`

---

## ⚙️ Backend Services

### 1. WithdrawalService (`src/services/withdrawal/withdrawal.service.ts`)

**Location:** `/var/www/html/backend.jackpotx.net/src/services/withdrawal/withdrawal.service.ts`

#### Key Methods:

##### `createWithdrawalRequest(request: WithdrawalRequest)`

Creates a new withdrawal request with full validation.

**Validations:**
1. **KYC Verification**: Checks if user has completed KYC (if required)
2. **Account Age**: Ensures account is older than minimum days
3. **Deposit Requirements**: Verifies minimum deposits made
4. **Balance Check**: Ensures sufficient balance including fees
5. **Amount Limits**: Validates min/max withdrawal amounts
6. **Pending Limits**: Checks maximum pending withdrawals
7. **Period Limits**: Validates daily/weekly/monthly limits
8. **Fraud Detection**: Runs multi-layer fraud checks

**Auto-Approval Logic:**
- If `auto_approve_enabled` is true
- Amount is under `auto_approve_threshold` ($100)
- Risk score is below `max_risk_score` (75)
- During configured hours
- → Automatically approved and processed

**Returns:**
```typescript
{
  withdrawalId: number,
  status: string,
  autoApproved: boolean,
  riskScore: number,
  gatewayTransactionId?: string
}
```

##### `performFraudChecks(client, userId, amount, ipAddress)`

Multi-factor fraud detection system.

**Checks:**
1. **Rapid Withdrawal Detection**: Multiple withdrawals in short time
2. **Deposit vs Withdrawal Ratio**: Abnormal withdrawal patterns
3. **IP Address Validation**: Known fraudulent IPs
4. **Suspicious Activity**: Pattern analysis

**Returns:**
```typescript
{
  riskScore: number (0-100),
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  checks: {
    rapidWithdrawal: boolean,
    suspiciousRatio: boolean,
    knownFraudIp: boolean,
    suspiciousActivity: boolean
  }
}
```

##### `approveWithdrawal(approval: WithdrawalApproval)`

Manual approval by admin.

**Parameters:**
```typescript
{
  withdrawal_id: number,
  approved_by: number,
  admin_notes?: string
}
```

**Actions:**
1. Updates status to `approved`
2. Records approval details
3. Processes payment through gateway
4. Logs audit entry

##### `rejectWithdrawal(rejection: WithdrawalRejection)`

Rejection with automatic refund.

**Parameters:**
```typescript
{
  withdrawal_id: number,
  rejected_by: number,
  rejection_reason: string,
  admin_notes?: string
}
```

**Actions:**
1. Updates status to `rejected`
2. Refunds amount to user balance
3. Records rejection details
4. Logs audit entry

##### `processPendingWithdrawals()`

Batch processing for cron job.

**Process:**
1. Fetches all `approved` withdrawals
2. Processes each through payment gateway
3. Updates status to `completed` or `failed`
4. Logs results

**Returns:**
```typescript
{
  processed: number,
  failed: number,
  skipped: number,
  totalAmount: number
}
```

---

### 2. WithdrawalProcessorCron (`src/services/withdrawal/withdrawal-cron.service.ts`)

**Location:** `/var/www/html/backend.jackpotx.net/src/services/withdrawal/withdrawal-cron.service.ts`

#### Automated Night Processing

**Schedule:** Every hour between 22:00 and 06:00 UTC
**Cron Expression:** `0 22-23,0-6 * * *`

**Features:**
- Automatic start on production server
- Manual trigger endpoint for testing
- Complete logging to audit trail
- Error handling and recovery
- Status monitoring endpoint

**Methods:**
- `start()` - Start the cron job
- `stop()` - Stop the cron job
- `manualTrigger()` - Manually trigger processing
- `getStatus()` - Get current status

---

## 🔌 API Endpoints

### User Endpoints

#### 1. Create Withdrawal Request
```http
POST /api/withdrawals
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "amount": 50.00,
  "payment_method": "crypto",
  "crypto_address": "0x1234567890abcdef",
  "crypto_network": "TRC20"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal request created and approved automatically",
  "data": {
    "withdrawalId": 123,
    "status": "approved",
    "autoApproved": true,
    "riskScore": 15,
    "gatewayTransactionId": "OXA_1234567890"
  }
}
```

#### 2. Get My Withdrawals
```http
GET /api/withdrawals?status=pending&limit=10&offset=0
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "amount": 50.00,
      "status": "pending",
      "created_at": "2025-11-05T14:30:00Z",
      ...
    }
  ]
}
```

#### 3. Get Withdrawal Details
```http
GET /api/withdrawals/:id
Authorization: Bearer {access_token}
```

#### 4. Cancel Withdrawal
```http
DELETE /api/withdrawals/:id
Authorization: Bearer {access_token}
```

---

### Admin Endpoints

#### 1. Get All Withdrawals
```http
GET /api/withdrawals/admin/all?status=pending&limit=100&offset=0
Authorization: Bearer {admin_access_token}
```

**Query Parameters:**
- `status` - Filter by status
- `payment_method` - Filter by payment method
- `user_id` - Filter by user
- `from_date` - Start date
- `to_date` - End date
- `limit` - Page size
- `offset` - Page offset

#### 2. Approve Withdrawal
```http
POST /api/withdrawals/admin/:id/approve
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "admin_notes": "Verified and approved"
}
```

#### 3. Reject Withdrawal
```http
POST /api/withdrawals/admin/:id/reject
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "reason": "Suspicious activity detected",
  "admin_notes": "Multiple rapid withdrawals"
}
```

#### 4. Get Statistics
```http
GET /api/withdrawals/admin/statistics?period=24h
Authorization: Bearer {admin_access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 145,
    "totalAmount": 125000.50,
    "pending": 12,
    "approved": 98,
    "rejected": 15,
    "completed": 98,
    "avgAmount": 862.07,
    "avgProcessingTime": "2.5 hours"
  }
}
```

#### 5. Get Settings
```http
GET /api/withdrawals/admin/settings
Authorization: Bearer {admin_access_token}
```

#### 6. Update Settings
```http
PUT /api/withdrawals/admin/settings
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "auto_approve_threshold": 150,
  "max_withdrawal_amount": 100000,
  "require_kyc": true
}
```

#### 7. Get Audit Log
```http
GET /api/withdrawals/admin/:id/audit
Authorization: Bearer {admin_access_token}
```

#### 8. Get Cron Status
```http
GET /api/withdrawals/admin/cron/status
Authorization: Bearer {admin_access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "isScheduled": true,
    "schedule": "0 22-23,0-6 * * * (Every hour between 22:00 and 06:00 UTC)",
    "currentTime": "2025-11-05T14:30:00.000Z",
    "currentHour": 14
  }
}
```

#### 9. Manually Trigger Cron
```http
POST /api/withdrawals/admin/cron/trigger
Authorization: Bearer {admin_access_token}
```

---

## 🔒 Security Features

### 1. Fraud Detection System

**Risk Scoring (0-100):**
- **0-25**: Low risk - Auto-approve eligible
- **26-50**: Medium risk - Requires admin review
- **51-75**: High risk - Additional verification needed
- **76-100**: Critical risk - Automatic rejection

**Detection Factors:**
- Rapid withdrawal patterns
- Deposit/withdrawal ratio analysis
- IP address reputation
- Account age and activity
- KYC verification status
- Historical fraud markers

### 2. Multi-Layer Validation

**Pre-Flight Checks:**
1. Authentication & Authorization
2. KYC Verification (if required)
3. Account Age Verification
4. Deposit History Validation
5. Balance Sufficiency Check
6. Amount Limit Validation
7. Pending Withdrawal Check
8. Period Limit Validation
9. Fraud Risk Assessment

### 3. Payment Gateway Integration

**OxaPay Crypto Integration:**
- Automated crypto payouts
- Multi-network support (TRC20, ERC20, BEP20)
- Real-time transaction tracking
- Gateway response logging

### 4. Complete Audit Trail

**Every Action Logged:**
- Actor identification (user/admin/system)
- Timestamp
- Action details
- IP address
- User agent
- Before/after states

---

## 🧪 Testing Guide

### 1. Test Auto-Approval

```bash
# Create small withdrawal (under $100)
curl -X POST http://localhost:3001/api/withdrawals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "payment_method": "crypto",
    "crypto_address": "0x1234567890abcdef1234567890abcdef12345678",
    "crypto_network": "TRC20"
  }'

# Expected: Auto-approved and processed
```

### 2. Test Manual Approval

```bash
# Create large withdrawal (over $100)
curl -X POST http://localhost:3001/api/withdrawals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "payment_method": "crypto",
    "crypto_address": "0x1234567890abcdef1234567890abcdef12345678",
    "crypto_network": "TRC20"
  }'

# Expected: Status = pending, awaiting admin approval

# Admin approves
curl -X POST http://localhost:3001/api/withdrawals/admin/1/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "admin_notes": "Verified and approved"
  }'
```

### 3. Test Fraud Detection

```bash
# Create multiple rapid withdrawals
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/withdrawals \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 50,
      "payment_method": "crypto",
      "crypto_address": "0x1234567890abcdef1234567890abcdef12345678",
      "crypto_network": "TRC20"
    }'
  sleep 1
done

# Expected: Increased risk scores after first withdrawal
```

### 4. Test Cron Job

```bash
# Check cron status
curl http://localhost:3001/api/withdrawals/admin/cron/status \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Manually trigger processing
curl -X POST http://localhost:3001/api/withdrawals/admin/cron/trigger \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 5. Test Settings Management

```bash
# Get current settings
curl http://localhost:3001/api/withdrawals/admin/settings \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Update settings
curl -X PUT http://localhost:3001/api/withdrawals/admin/settings \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auto_approve_threshold": 200,
    "max_withdrawal_amount": 100000
  }'
```

---

## 📊 Database Queries

### Get All Pending Withdrawals
```sql
SELECT w.*, u.username, u.email
FROM withdrawal_requests w
JOIN users u ON w.user_id = u.id
WHERE w.status = 'pending'
ORDER BY w.created_at ASC;
```

### Get User Withdrawal Statistics
```sql
SELECT
    user_id,
    COUNT(*) as total_withdrawals,
    SUM(amount) as total_amount,
    AVG(risk_score) as avg_risk_score
FROM withdrawal_requests
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_amount DESC;
```

### Get Audit Trail for Withdrawal
```sql
SELECT * FROM withdrawal_audit_log
WHERE withdrawal_id = 123
ORDER BY created_at DESC;
```

---

## 🚀 Deployment Checklist

- [x] Database tables created
- [x] Default settings inserted
- [x] Backend service implemented
- [x] API endpoints created
- [x] Routes registered
- [x] Cron job configured
- [ ] Admin UI implemented
- [ ] Frontend withdrawal form created
- [ ] Email notifications configured
- [ ] End-to-end testing completed
- [ ] Load testing performed
- [ ] Documentation reviewed

---

## 📝 Notes

### File Permissions Fixed
All withdrawal-related files have correct ownership (`ubuntu:ubuntu`) and permissions.

### Backend Status
- ✅ Backend running on PM2 (PID varies)
- ✅ PostgreSQL connected
- ✅ MongoDB connected
- ✅ Routes registered (verify with `/routes` endpoint)

### Next Steps
1. Create admin withdrawal management UI
2. Create frontend user withdrawal form
3. Implement email notification service
4. Perform end-to-end testing
5. Load testing with concurrent withdrawals
6. Security audit

---

**Implementation Date:** November 5, 2025
**Version:** 1.0.0
**Backend Status:** ✅ Complete
**Frontend Status:** ⏳ Pending
