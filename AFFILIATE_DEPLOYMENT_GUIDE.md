# Affiliate System Deployment & Testing Guide

## 📋 Prerequisites

- Node.js runtime
- PostgreSQL database access
- Admin user account with JWT token
- API testing tool (Postman, curl, or similar)

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
# Navigate to project directory
cd /var/www/html/backend.jackpotx.net

# Run the migration
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -f migration-affiliate-enhancement.sql
```

**Expected Output:**
```
CREATE TABLE
CREATE INDEX
CREATE FUNCTION
...
COMMIT
```

**Verify Migration:**
```bash
# Check if tables exist
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "\dt affiliate*"
```

You should see:
- `affiliate_applications`
- `affiliate_balance_transactions`
- `affiliate_redemptions`
- `affiliate_settings`
- (plus existing affiliate tables)

### Step 2: Build TypeScript Code

```bash
# Compile TypeScript to JavaScript
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
```

**Verify Build:**
```bash
# Check if new dist files exist
ls -la dist/services/affiliate/affiliate-application.service.js
ls -la dist/services/affiliate/affiliate-balance.service.js
ls -la dist/api/admin/affiliate-admin.controller.js
ls -la dist/routes/admin-affiliate.routes.js
```

### Step 3: Restart Application

```bash
# Using PM2
pm2 restart backend

# Or using npm (development)
npm run dev
```

**Verify Server Started:**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs backend --lines 50
```

Look for:
```
✓ Server started on port 3001
✓ Connected to PostgreSQL
✓ Connected to MongoDB
```

### Step 4: Verify Routes Registered

```bash
# Test health endpoint
curl http://localhost:3001/health

# Check if new routes are accessible (will return 401 without auth)
curl -I http://localhost:3001/api/admin/affiliate-dashboard
```

Expected: `HTTP/1.1 401 Unauthorized` (means route exists, needs auth)

---

## 🧪 Testing Guide

### Preparation: Get Admin Token

```bash
# Login as admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_admin_password"
  }'
```

**Save the token from response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..." // <-- Use this token
  }
}
```

**Set Token Variable:**
```bash
export TOKEN="eyJhbGc..."
```

---

## 📝 API Testing Scenarios

### Test 1: Dashboard Statistics

```bash
curl http://localhost:3001/api/admin/affiliate-dashboard \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_affiliates": 0,
      "active_affiliates": 0,
      ...
    },
    "applicationStats": {
      "pending_count": 0,
      ...
    }
  }
}
```

### Test 2: Get Settings

```bash
curl http://localhost:3001/api/admin/affiliate-settings \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "commission_rates": {
      "level_1": 5.0,
      "level_2": 2.0,
      "level_3": 1.0
    },
    "redemption_settings": {
      "minimum_redemption": 10.00,
      "instant_percentage": 50,
      "lock_days": 7
    }
  }
}
```

### Test 3: Update Settings

```bash
curl -X PUT http://localhost:3001/api/admin/affiliate-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settingKey": "commission_rates",
    "settingValue": {
      "level_1": 6.0,
      "level_2": 2.5,
      "level_3": 1.5,
      "deposit": 12.0,
      "bet_revenue": 4.0,
      "loss": 6.0
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### Test 4: Create Test Application (as User)

First, create a test user or use existing user token:

```bash
# Get user token (not admin)
export USER_TOKEN="user_token_here"

# Submit application
curl -X POST http://localhost:3001/api/affiliate/apply \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test Affiliate Marketing",
    "websiteUrl": "https://testaffiliate.com",
    "socialMediaLinks": {
      "instagram": "@testaffiliate"
    },
    "trafficSources": ["Instagram", "Twitter"],
    "expectedMonthlyReferrals": 25,
    "marketingExperience": "I have 2 years of experience in affiliate marketing for online casinos."
  }'
```

### Test 5: View Pending Applications (as Admin)

```bash
curl http://localhost:3001/api/admin/affiliate-applications?status=pending \
  -H "Authorization: Bearer $TOKEN"
```

### Test 6: Approve Application

```bash
# Get application ID from previous response
export APP_ID=1

curl -X POST http://localhost:3001/api/admin/affiliate-applications/$APP_ID/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commissionRate": 5.0,
    "adminNotes": "Test approval"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Application approved successfully",
  "data": {
    "application": { ... },
    "profile": {
      "referral_code": "ABC123XY",
      "is_active": true
    }
  }
}
```

### Test 7: View Affiliates

```bash
curl http://localhost:3001/api/admin/affiliates \
  -H "Authorization: Bearer $TOKEN"
```

### Test 8: Adjust Balance

```bash
# Get affiliate ID from previous response
export AFFILIATE_ID=1

curl -X POST http://localhost:3001/api/admin/affiliates/$AFFILIATE_ID/balance/adjust \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "description": "Test bonus"
  }'
```

### Test 9: View Balance

```bash
curl http://localhost:3001/api/admin/affiliates/$AFFILIATE_ID/balance \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "affiliate_balance": 100.00,
    "affiliate_balance_locked": 0,
    "affiliate_total_earned": 100.00,
    "affiliate_total_redeemed": 0,
    "pending_commissions": 0,
    "approved_commissions": 0
  }
}
```

### Test 10: View Balance History

```bash
curl http://localhost:3001/api/admin/affiliates/$AFFILIATE_ID/balance-history \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 Troubleshooting

### Error: "Table does not exist"

**Cause:** Migration not run or failed

**Solution:**
```bash
# Check if migration was applied
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "\dt affiliate_applications"

# If not exists, run migration again
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -f migration-affiliate-enhancement.sql
```

### Error: "Cannot find module"

**Cause:** TypeScript not compiled

**Solution:**
```bash
npm run build
pm2 restart backend
```

### Error: "401 Unauthorized"

**Cause:** Missing or invalid token

**Solution:**
```bash
# Get fresh token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'

# Update TOKEN variable
export TOKEN="new_token_here"
```

### Error: "403 Forbidden"

**Cause:** User doesn't have Admin/Manager role

**Solution:**
```bash
# Verify user roles
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
  SELECT u.username, r.name as role
  FROM users u
  JOIN user_roles ur ON u.id = ur.user_id
  JOIN roles r ON ur.role_id = r.id
  WHERE u.username = 'your_username'
"

# If missing Admin role, add it
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "
  INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, r.id
  FROM users u, roles r
  WHERE u.username = 'your_username' AND r.name = 'Admin'
  ON CONFLICT (user_id, role_id) DO NOTHING
"
```

### Error: "Function does not exist"

**Cause:** Database function not created

**Solution:**
```bash
# Re-run migration
PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -f migration-affiliate-enhancement.sql
```

### Server Won't Start

**Check Logs:**
```bash
pm2 logs backend --lines 100
```

**Common Issues:**
1. Port already in use → Change port in .env
2. Database connection failed → Check DB credentials in .env
3. Syntax error in code → Check build output

**Rebuild and Restart:**
```bash
npm run build
pm2 restart backend
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Migration ran successfully
- [ ] All tables created (affiliate_applications, affiliate_balance_transactions, etc.)
- [ ] TypeScript compiled without errors
- [ ] Server started successfully
- [ ] Dashboard endpoint returns data: `GET /api/admin/affiliate-dashboard`
- [ ] Settings endpoint returns data: `GET /api/admin/affiliate-settings`
- [ ] Can update settings: `PUT /api/admin/affiliate-settings`
- [ ] Can view applications: `GET /api/admin/affiliate-applications`
- [ ] Can approve application: `POST /api/admin/affiliate-applications/:id/approve`
- [ ] Can view affiliates: `GET /api/admin/affiliates`
- [ ] Can adjust balance: `POST /api/admin/affiliates/:id/balance/adjust`
- [ ] Can view balance: `GET /api/admin/affiliates/:id/balance`

---

## 📊 Sample Data for Testing

### Create Sample Application

```sql
-- Run in psql
INSERT INTO users (username, email, password) VALUES ('test_affiliate', 'test@affiliate.com', 'hashed_password');

-- Get user ID
SELECT id FROM users WHERE username = 'test_affiliate';

-- Insert sample application (replace USER_ID with actual ID)
INSERT INTO affiliate_applications (
  user_id, display_name, website_url, social_media_links,
  traffic_sources, expected_monthly_referrals, marketing_experience,
  application_status
) VALUES (
  USER_ID,
  'Test Marketing Agency',
  'https://testmarketing.com',
  '{"instagram": "@testmarketing", "twitter": "@testmkt"}',
  ARRAY['Instagram', 'Twitter', 'YouTube'],
  50,
  'I have 3 years of affiliate marketing experience in the gaming industry...',
  'pending'
);
```

### Create Sample Affiliate (After Approval)

```sql
-- This happens automatically when you approve an application via API
-- But for manual testing:

INSERT INTO affiliate_profiles (
  user_id, referral_code, display_name, commission_rate, is_active
) VALUES (
  USER_ID,
  'TEST123',
  'Test Marketing Agency',
  5.0,
  true
);

-- Assign Affiliate role
INSERT INTO user_roles (user_id, role_id)
SELECT USER_ID, id FROM roles WHERE name = 'Affiliate';
```

---

## 🎯 Next Steps

After successful deployment and testing:

1. **Frontend Integration**
   - Use API reference: `ADMIN_AFFILIATE_API_REFERENCE.md`
   - Build admin panel pages for:
     - Applications management
     - Affiliates list
     - Commission approvals
     - Redemptions monitoring
     - Settings management

2. **User Endpoints**
   - Implement user-facing affiliate endpoints (next phase)
   - Application submission form
   - Affiliate dashboard
   - Balance and redemption pages

3. **Automation**
   - Set up cron job for unlocking redemptions
   - Configure auto-approval thresholds (if desired)
   - Set up email notifications

4. **Monitoring**
   - Add logging for all affiliate operations
   - Set up alerts for high-value commissions
   - Monitor redemption patterns

---

**For complete API documentation, see `ADMIN_AFFILIATE_API_REFERENCE.md`**
