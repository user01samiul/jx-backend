# 🎯 JackpotX Affiliate System Enhancement Plan

## Executive Summary

Your casino backend **already has a comprehensive affiliate system** with MLM (Multi-Level Marketing), commission tracking, team management, and payout processing. However, to meet your specific requirements for user application workflow, balance management, and the 50/50 withdrawal rule, we need to enhance the existing system.

---

## 📊 Current System Analysis

### ✅ What Already Exists

#### 1. **Complete Database Schema**
- `affiliate_profiles` - Affiliate profile data with MLM fields
- `affiliate_relationships` - Affiliate-to-player relationships
- `affiliate_commissions` - Commission tracking (pending, approved, paid)
- `affiliate_payouts` - Payout batch processing
- `affiliate_teams` - Team management
- `affiliate_tracking` - Click and conversion tracking
- `affiliate_marketing_materials` - Marketing assets
- `team_performance` - Team analytics
- `manager_permissions` - Manager access control

#### 2. **Role System**
- **Affiliate** - Standard affiliate marketing partner
- **Influencer** - Influencer marketing partner
- **Affiliates Manager** - Manages affiliate teams
- Existing roles: Admin, Player, Support, Developer, Accountant, Manager, Moderator

#### 3. **Commission Structure**
- **MLM Levels**: Level 1 (5%), Level 2 (2%), Level 3 (1%)
- **Commission Types**: deposit, bet, loss, net_gaming_revenue
- **Status Flow**: pending → approved → paid
- **Automated Calculation**: Functions for commission calculation

#### 4. **Existing API Endpoints**
- `/api/enhanced-affiliate/profile` - Create affiliate profile
- `/api/enhanced-affiliate/dashboard` - Affiliate dashboard
- `/api/enhanced-affiliate/mlm-structure` - MLM tree view
- `/api/enhanced-affiliate/admin/*` - Admin management
- `/api/enhanced-affiliate/manager/*` - Manager functions
- `/api/enhanced-affiliate/track-referral` - Click tracking
- `/api/enhanced-affiliate/record-conversion` - Conversion tracking

#### 5. **Services & Business Logic**
- `EnhancedAffiliateService` - MLM structure management
- Commission calculation based on betting activity
- Upline/downline tracking
- Team performance analytics

---

## ❌ What's Missing (Based on Your Requirements)

### 1. **Affiliate Application & Approval Workflow**
**Current State**: Admins manually create affiliate profiles
**Required**: Users can apply to become affiliates; admins approve/reject

### 2. **Affiliate Balance System**
**Current State**: Commissions tracked in `affiliate_commissions` table only
**Required**: Separate affiliate balance that can be redeemed to main balance

### 3. **Commission Redemption System**
**Current State**: Payout system exists but doesn't integrate with main user balance
**Required**: Affiliates can redeem commissions to their main casino balance

### 4. **50/50 Withdrawal Rule**
**Current State**: No withdrawal restriction logic
**Required**: 50% instant redemption + 50% locked for 1 week

### 5. **User Profile Integration**
**Current State**: Affiliate panel separate from user system
**Required**: Show affiliate menu in user profile sidebar when approved

### 6. **Automatic Commission Triggers**
**Current State**: Commission calculation exists but no automatic triggers
**Required**: Auto-create commissions on deposit, bet, win, loss events

---

## 🏗️ Enhancement Plan

### Phase 1: Affiliate Application System

#### 1.1 Database Changes

**New Table: `affiliate_applications`**
```sql
CREATE TABLE affiliate_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  application_status VARCHAR(20) DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected')),

  -- Application data
  display_name VARCHAR(100) NOT NULL,
  website_url VARCHAR(255),
  social_media_links JSONB,
  traffic_sources TEXT[], -- Where they will promote
  expected_monthly_referrals INTEGER,
  marketing_experience TEXT,
  additional_info TEXT,

  -- Referral code preferences
  preferred_referral_code VARCHAR(50),
  upline_referral_code VARCHAR(50), -- Join under existing affiliate

  -- Review data
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, application_status) -- One pending application per user
);

CREATE INDEX idx_affiliate_applications_user_id ON affiliate_applications(user_id);
CREATE INDEX idx_affiliate_applications_status ON affiliate_applications(application_status);
CREATE INDEX idx_affiliate_applications_created_at ON affiliate_applications(created_at);
```

**Extend: `affiliate_profiles`**
```sql
-- Add new fields to existing table
ALTER TABLE affiliate_profiles
ADD COLUMN application_id INTEGER REFERENCES affiliate_applications(id),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN approved_by INTEGER REFERENCES users(id);
```

#### 1.2 API Endpoints

**User Endpoints** (Authenticated Player)
- `POST /api/affiliate/apply` - Submit affiliate application
- `GET /api/affiliate/application-status` - Check application status
- `GET /api/affiliate/my-profile` - Get affiliate profile (if approved)

**Admin Endpoints**
- `GET /api/admin/affiliate-applications` - List pending applications (pagination, filters)
- `GET /api/admin/affiliate-applications/:id` - View application details
- `POST /api/admin/affiliate-applications/:id/approve` - Approve application
- `POST /api/admin/affiliate-applications/:id/reject` - Reject application

#### 1.3 Workflow

```
[User] → Apply to Affiliate Program
   ↓
[System] → Create affiliate_applications record (status: pending)
   ↓
[Admin/Manager] → Review application
   ↓
   ├─→ [Approve] → Create affiliate_profiles + Assign "Affiliate" role
   │                → Send approval email
   │                → Affiliate panel appears in user sidebar
   │
   └─→ [Reject] → Update application_status = 'rejected'
                 → Send rejection email with reason
                 → User can reapply after X days
```

---

### Phase 2: Affiliate Balance System

#### 2.1 Database Changes

**Extend: `user_balances`**
```sql
-- Add affiliate balance to existing table
ALTER TABLE user_balances
ADD COLUMN affiliate_balance NUMERIC(20,2) DEFAULT 0,
ADD COLUMN affiliate_balance_locked NUMERIC(20,2) DEFAULT 0, -- For 50/50 rule
ADD COLUMN affiliate_total_earned NUMERIC(20,2) DEFAULT 0,
ADD COLUMN affiliate_total_redeemed NUMERIC(20,2) DEFAULT 0;
```

**New Table: `affiliate_balance_transactions`**
```sql
CREATE TABLE affiliate_balance_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
    'commission_earned',
    'redemption_instant',
    'redemption_unlocked',
    'adjustment'
  )),

  -- Amounts
  amount NUMERIC(20,2) NOT NULL,
  balance_before NUMERIC(20,2) NOT NULL,
  balance_after NUMERIC(20,2) NOT NULL,

  -- References
  commission_id INTEGER REFERENCES affiliate_commissions(id), -- If from commission
  redemption_id INTEGER, -- Link to redemption record

  -- Metadata
  description TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1
);

CREATE INDEX idx_affiliate_balance_tx_user_id ON affiliate_balance_transactions(user_id);
CREATE INDEX idx_affiliate_balance_tx_type ON affiliate_balance_transactions(transaction_type);
CREATE INDEX idx_affiliate_balance_tx_created_at ON affiliate_balance_transactions(created_at);
```

**New Table: `affiliate_redemptions`**
```sql
CREATE TABLE affiliate_redemptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Redemption amounts
  total_amount NUMERIC(20,2) NOT NULL, -- Total requested
  instant_amount NUMERIC(20,2) NOT NULL, -- 50% instant
  locked_amount NUMERIC(20,2) NOT NULL, -- 50% locked

  -- Status tracking
  instant_status VARCHAR(20) DEFAULT 'completed' CHECK (instant_status IN ('completed', 'failed')),
  locked_status VARCHAR(20) DEFAULT 'locked' CHECK (locked_status IN ('locked', 'unlocked', 'cancelled')),

  -- Unlock tracking
  unlock_date TIMESTAMPTZ NOT NULL, -- When locked portion unlocks (created_at + 7 days)
  unlocked_at TIMESTAMPTZ, -- Actual unlock timestamp

  -- Transaction references
  instant_transaction_id INTEGER, -- Main balance transaction for instant 50%
  unlock_transaction_id INTEGER, -- Main balance transaction for unlocked 50%

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_affiliate_redemptions_user_id ON affiliate_redemptions(user_id);
CREATE INDEX idx_affiliate_redemptions_unlock_date ON affiliate_redemptions(unlock_date);
CREATE INDEX idx_affiliate_redemptions_locked_status ON affiliate_redemptions(locked_status);
```

#### 2.2 Balance Flow Logic

**Earning Commissions**:
```
[User deposits/bets/loses]
   ↓
[Calculate commission for affiliate(s)]
   ↓
[Create affiliate_commissions record (status: pending)]
   ↓
[Admin approves commission]
   ↓
[Update affiliate_commissions status → approved]
   ↓
[Add to affiliate_balance]
   ↓
[Create affiliate_balance_transactions record]
```

**Redemption Flow (50/50 Rule)**:
```
[Affiliate requests redemption: $100]
   ↓
[System calculates:]
   - Instant: $50 (50%)
   - Locked: $50 (50%, unlock_date = now + 7 days)
   ↓
[Create affiliate_redemptions record]
   ↓
[Instant Transfer:]
   1. Deduct $50 from affiliate_balance
   2. Add $50 to main balance (user_balances.balance)
   3. Create transaction in transactions table (type: 'bonus', description: 'Affiliate commission redemption')
   4. Create affiliate_balance_transactions (type: 'redemption_instant')
   ↓
[Locked Portion:]
   1. Deduct $50 from affiliate_balance
   2. Add $50 to affiliate_balance_locked
   3. Create affiliate_balance_transactions (type: 'redemption_instant')
   4. Schedule unlock for 7 days later
   ↓
[After 7 Days - Cron Job:]
   1. Find redemptions where unlock_date <= now AND locked_status = 'locked'
   2. Transfer from affiliate_balance_locked to main balance
   3. Update locked_status → 'unlocked'
   4. Create transaction in transactions table
   5. Create affiliate_balance_transactions (type: 'redemption_unlocked')
```

#### 2.3 API Endpoints

**Affiliate Endpoints**
- `GET /api/affiliate/balance` - Get affiliate balance details
  - Returns: balance, locked_balance, total_earned, total_redeemed, pending_commissions
- `GET /api/affiliate/balance-history` - Transaction history
- `POST /api/affiliate/redeem` - Request commission redemption
  - Request body: `{ amount: number }`
  - Validates: amount <= available balance
  - Returns: redemption details (instant + locked amounts, unlock date)
- `GET /api/affiliate/redemptions` - List redemption history
- `GET /api/affiliate/pending-unlocks` - Show upcoming unlocks

**Admin Endpoints**
- `GET /api/admin/affiliates/:id/balance` - View affiliate balance
- `POST /api/admin/affiliates/:id/balance/adjust` - Manual adjustment
- `GET /api/admin/affiliate-redemptions` - All redemptions with filters

---

### Phase 3: Automatic Commission Triggers

#### 3.1 Integration Points

**Deposit Event**:
```typescript
// In deposit processing service
async function processDeposit(userId: number, amount: number) {
  // ... existing deposit logic ...

  // Check if user was referred by an affiliate
  const affiliateRelation = await getAffiliateRelationship(userId);

  if (affiliateRelation && isFirstDeposit(userId)) {
    // Calculate commission (e.g., 10% of first deposit)
    await AffiliateCommissionService.createDepositCommission({
      affiliateId: affiliateRelation.affiliate_id,
      referredUserId: userId,
      depositAmount: amount,
      commissionType: 'deposit'
    });
  }
}
```

**Bet Event**:
```typescript
// In bet processing (after bet completes)
async function processBetRevenue(userId: number, betAmount: number, winAmount: number) {
  const affiliateRelation = await getAffiliateRelationship(userId);

  if (affiliateRelation) {
    const loss = betAmount - winAmount;

    if (loss > 0) {
      // User lost - create loss commission
      await AffiliateCommissionService.createLossCommission({
        affiliateId: affiliateRelation.affiliate_id,
        referredUserId: userId,
        lossAmount: loss,
        commissionType: 'loss'
      });
    }
  }
}
```

**MLM Commission Calculation**:
```typescript
// Service: AffiliateCommissionService
async function createDepositCommission(data) {
  const { affiliateId, referredUserId, depositAmount } = data;

  // Calculate MLM commissions for all levels
  const affiliateChain = await getAffiliateUplineChain(affiliateId); // [L1, L2, L3]

  const commissionRates = {
    1: 5.0,  // Level 1: 5%
    2: 2.0,  // Level 2: 2%
    3: 1.0   // Level 3: 1%
  };

  for (const [level, uplineId] of affiliateChain.entries()) {
    const levelNumber = level + 1;
    const rate = commissionRates[levelNumber];
    const commissionAmount = (depositAmount * rate) / 100;

    // Create commission record
    await createCommissionRecord({
      affiliateId: uplineId,
      referredUserId,
      amount: commissionAmount,
      rate,
      baseAmount: depositAmount,
      type: 'deposit',
      level: levelNumber,
      status: 'pending' // Requires admin approval
    });
  }
}
```

#### 3.2 Cron Jobs

**Daily Commission Approval** (Optional Automation):
```typescript
// Auto-approve small commissions under threshold
cron.schedule('0 2 * * *', async () => {
  const AUTO_APPROVE_THRESHOLD = 10.00; // $10

  await db.query(`
    UPDATE affiliate_commissions
    SET status = 'approved'
    WHERE status = 'pending'
      AND commission_amount <= $1
      AND created_at < NOW() - INTERVAL '24 hours'
  `, [AUTO_APPROVE_THRESHOLD]);

  // Update affiliate balances
  await syncAffiliateBalances();
});
```

**Weekly Unlock Redemptions**:
```typescript
cron.schedule('0 */6 * * *', async () => {
  // Every 6 hours, unlock redemptions
  const redemptions = await db.query(`
    SELECT * FROM affiliate_redemptions
    WHERE locked_status = 'locked'
      AND unlock_date <= NOW()
  `);

  for (const redemption of redemptions.rows) {
    await unlockRedemption(redemption.id);
  }
});
```

---

### Phase 4: Frontend Integration

#### 4.1 User Profile Sidebar Menu

**Logic**:
```typescript
// Frontend: Check if user has affiliate role
const userRoles = await getUserRoles(userId);
const isAffiliate = userRoles.includes('Affiliate');

// Sidebar menu items
const menuItems = [
  { label: 'Dashboard', path: '/profile/dashboard' },
  { label: 'Balance', path: '/profile/balance' },
  { label: 'Transactions', path: '/profile/transactions' },

  // Show only if affiliate
  ...(isAffiliate ? [
    { label: 'Affiliate Dashboard', path: '/profile/affiliate' },
    { label: 'Referrals', path: '/profile/affiliate/referrals' },
    { label: 'Commissions', path: '/profile/affiliate/commissions' },
    { label: 'Affiliate Balance', path: '/profile/affiliate/balance' },
    { label: 'Marketing Tools', path: '/profile/affiliate/marketing' }
  ] : []),

  // Show only if not affiliate and no pending application
  ...(!isAffiliate && !hasPendingApplication ? [
    { label: 'Join Affiliate Program', path: '/profile/affiliate/apply' }
  ] : [])
];
```

#### 4.2 Affiliate Panel Pages

**Pages to Create**:

1. **Application Page** (`/profile/affiliate/apply`)
   - Form: display_name, website_url, social_media_links, traffic_sources, marketing_experience
   - Optional: upline_referral_code (join under existing affiliate)
   - Submit → POST `/api/affiliate/apply`

2. **Affiliate Dashboard** (`/profile/affiliate`)
   - Overview stats: total_referrals, total_commission_earned, pending_commissions
   - Recent referrals
   - Commission summary by type
   - MLM structure visualization

3. **Affiliate Balance** (`/profile/affiliate/balance`)
   - Available balance
   - Locked balance (with unlock dates)
   - Redemption button → Modal with 50/50 breakdown
   - Transaction history
   - Pending unlocks timeline

4. **Referrals** (`/profile/affiliate/referrals`)
   - List of referred users
   - Click tracking stats
   - Referral link copy button
   - QR code generator

5. **Commissions** (`/profile/affiliate/commissions`)
   - Commission history (pending, approved, paid)
   - Filter by type, date range
   - Export to CSV

#### 4.3 Admin Panel Integration

**Add to Admin Menu**:
- Affiliate Management
  - Pending Applications (badge with count)
  - All Affiliates
  - Teams & Managers
  - Commission Approvals
  - Redemption History
  - Settings (commission rates, approval thresholds)

---

## 🔄 Complete Workflow Example

### Scenario: Player Becomes Affiliate and Earns Commission

**Step 1: Application**
```
1. Player "Alice" submits affiliate application
   POST /api/affiliate/apply
   {
     "display_name": "Alice Marketing",
     "website_url": "https://alicereviews.com",
     "social_media_links": {"instagram": "@alicereviews"},
     "traffic_sources": ["Instagram", "YouTube"],
     "expected_monthly_referrals": 50,
     "upline_referral_code": "JOHN123" // Join under John's network
   }

2. System creates affiliate_applications record (status: pending)

3. Admin receives notification → Reviews application

4. Admin approves:
   POST /api/admin/affiliate-applications/123/approve
   {
     "commission_rate": 5.0,
     "team_id": 1
   }

5. System:
   - Creates affiliate_profiles record
   - Assigns "Affiliate" role to Alice
   - Creates affiliate_relationship with John (upline)
   - Sends approval email

6. Alice logs in → Sees "Affiliate Dashboard" in sidebar
```

**Step 2: Referral & Commission**
```
1. Alice shares referral link: https://casino.com/register?ref=ALICE789

2. Bob clicks link → System tracks:
   POST /api/enhanced-affiliate/track-referral
   - Stores click in affiliate_tracking
   - Sets cookie with referral code

3. Bob registers → System:
   - Detects referral cookie
   - Creates affiliate_relationships record (Alice → Bob)

4. Bob makes first deposit: $100

5. System triggers commission:
   - Level 1 (Alice): $100 × 5% = $5.00
   - Level 2 (John, Alice's upline): $100 × 2% = $2.00

6. Creates affiliate_commissions records (status: pending)

7. Admin approves commissions → Status = 'approved'

8. System updates:
   - affiliate_profiles.total_commission_earned
   - user_balances.affiliate_balance (Alice: +$5, John: +$2)
   - Creates affiliate_balance_transactions
```

**Step 3: Redemption (50/50 Rule)**
```
1. Alice has affiliate_balance = $50.00

2. Alice requests redemption:
   POST /api/affiliate/redeem
   { "amount": 50.00 }

3. System calculates:
   - Instant: $25.00 (50%)
   - Locked: $25.00 (50%, unlock date: 7 days from now)

4. System processes:
   a) Create affiliate_redemptions record

   b) Instant transfer:
      - user_balances.affiliate_balance: $50 → $25
      - user_balances.balance: +$25
      - Create transaction (type: 'bonus', description: 'Affiliate commission redemption (instant)')

   c) Lock portion:
      - user_balances.affiliate_balance: $25 → $0
      - user_balances.affiliate_balance_locked: +$25

5. Response to Alice:
   {
     "success": true,
     "redemption": {
       "total_amount": 50.00,
       "instant_amount": 25.00,
       "locked_amount": 25.00,
       "unlock_date": "2024-02-07T00:00:00Z"
     }
   }

6. Alice sees:
   - Main balance: +$25 (can use in casino immediately)
   - Affiliate locked balance: $25 (countdown timer: "Unlocks in 7 days")

7. After 7 days → Cron job:
   - Detects unlock_date reached
   - Transfers $25 from locked to main balance
   - Updates redemption record: locked_status = 'unlocked'
   - Sends notification: "Your locked affiliate balance ($25) has been unlocked!"
```

---

## 📋 Implementation Checklist

### Phase 1: Application System ✓
- [ ] Create `affiliate_applications` table migration
- [ ] Extend `affiliate_profiles` table with approval fields
- [ ] Create application API endpoints (user + admin)
- [ ] Create `AffiliateApplicationService` with approval logic
- [ ] Add email notifications (approval, rejection)
- [ ] Frontend: Application form
- [ ] Frontend: Admin application review page
- [ ] Add "Affiliate" role assignment on approval
- [ ] Test: Apply → Approve → Verify role and profile created

### Phase 2: Balance System ✓
- [ ] Extend `user_balances` table with affiliate fields
- [ ] Create `affiliate_balance_transactions` table
- [ ] Create `affiliate_redemptions` table
- [ ] Create `AffiliateBalanceService` with balance operations
- [ ] Implement redemption logic (50/50 split)
- [ ] Create redemption API endpoints
- [ ] Create unlock cron job
- [ ] Frontend: Affiliate balance page
- [ ] Frontend: Redemption modal with 50/50 breakdown
- [ ] Frontend: Pending unlocks display
- [ ] Test: Earn commission → Redeem → Verify instant + locked amounts

### Phase 3: Auto Commissions ✓
- [ ] Integrate with deposit service (first deposit commission)
- [ ] Integrate with bet service (loss/revenue commission)
- [ ] Create `AffiliateCommissionService.createDepositCommission()`
- [ ] Create `AffiliateCommissionService.createLossCommission()`
- [ ] Implement MLM upline chain calculation
- [ ] Add commission approval workflow
- [ ] Create auto-approval cron job (optional)
- [ ] Test: Referred user deposits → Verify commissions created for all levels

### Phase 4: Frontend Integration ✓
- [ ] Update user profile sidebar menu logic
- [ ] Create affiliate dashboard page
- [ ] Create referrals page with link copy
- [ ] Create commissions history page
- [ ] Create balance page with redemption
- [ ] Admin: Pending applications page
- [ ] Admin: Affiliate management pages
- [ ] Admin: Commission approval page
- [ ] Test: End-to-end user journey

### Phase 5: Testing & Documentation ✓
- [ ] Unit tests for all services
- [ ] Integration tests for workflows
- [ ] Load testing for commission calculations
- [ ] Update API documentation
- [ ] Create user guide for affiliates
- [ ] Create admin guide for affiliate management
- [ ] Update frontend integration docs

---

## 🎯 Key Technical Decisions

### 1. Why Separate Affiliate Balance?
**Decision**: Use `user_balances.affiliate_balance` instead of just tracking in `affiliate_commissions`

**Reasoning**:
- Clear separation between casino balance and affiliate earnings
- Easy to implement redemption logic
- Prevents accidental gambling of affiliate earnings
- Simplifies balance queries and UI display

### 2. Why 50/50 Lock in Database?
**Decision**: Use `affiliate_balance_locked` field + `affiliate_redemptions` table

**Reasoning**:
- Database enforces the lock (can't be bypassed)
- Unlock date tracked in database
- Cron job handles unlocking reliably
- Audit trail in `affiliate_redemptions`

### 3. Why Approval Workflow?
**Decision**: Commissions start as 'pending', require admin approval

**Reasoning**:
- Prevents fraud (fake referrals, bonus abuse)
- Allows review of suspicious activity
- Admin can adjust or reject commissions
- Can auto-approve small amounts to reduce workload

### 4. Why Application System?
**Decision**: Users apply, admins approve (vs. self-service registration)

**Reasoning**:
- Quality control (prevent spam affiliates)
- KYC/compliance for affiliates
- Allows setting custom commission rates
- Can assign to teams/managers

---

## 🚀 Recommended Implementation Order

1. **Week 1-2**: Phase 1 (Application System)
   - Database migrations
   - Backend API endpoints
   - Basic frontend application form
   - Admin approval interface

2. **Week 3-4**: Phase 2 (Balance System)
   - Balance tables and fields
   - Redemption logic (50/50 rule)
   - Frontend balance page
   - Unlock cron job

3. **Week 5**: Phase 3 (Auto Commissions)
   - Integration with deposit/bet services
   - Commission creation logic
   - MLM chain calculation
   - Testing with real scenarios

4. **Week 6**: Phase 4 (Frontend Polish)
   - Complete all affiliate pages
   - Admin panel integration
   - User experience refinements
   - Analytics and reporting

5. **Week 7**: Testing & Launch
   - Comprehensive testing
   - Documentation
   - Soft launch with beta affiliates
   - Monitor and fix issues

---

## 📊 Database Relationship Diagram

```
users
  ├─→ affiliate_applications (user applies)
  │     └─→ affiliate_profiles (when approved)
  │           ├─→ affiliate_relationships (tracks referred users)
  │           │     └─→ affiliate_commissions (earnings)
  │           │           └─→ affiliate_payouts (batched payments)
  │           ├─→ affiliate_balance_transactions (balance history)
  │           └─→ affiliate_redemptions (50/50 redemptions)
  │
  └─→ user_balances
        ├─→ balance (main casino balance)
        ├─→ affiliate_balance (redeemable affiliate earnings)
        └─→ affiliate_balance_locked (50% locked for 7 days)
```

---

## 💡 Additional Recommendations

### 1. Analytics & Reporting
- Affiliate performance dashboard (top earners, conversion rates)
- Revenue attribution report (how much revenue from affiliates)
- Fraud detection (duplicate IPs, self-referrals)

### 2. Marketing Tools
- Referral link generator with QR codes
- Banner/creative library
- Landing page builder
- Email templates for affiliates

### 3. Gamification
- Affiliate leaderboard (monthly competitions)
- Achievement badges (milestones: 10 referrals, $1000 earned)
- Bonus commission for top performers

### 4. Advanced Features
- Custom commission plans per affiliate
- Tiered commission rates (more referrals = higher %)
- Sub-affiliate system (deeper MLM levels)
- API for affiliates (programmatic access)

---

## ✅ Success Criteria

1. **User Journey**:
   - Player can apply to affiliate program in < 2 minutes
   - Admin can approve/reject application in < 1 minute
   - Approved affiliates see panel in sidebar immediately
   - Referral link works and tracks clicks/conversions

2. **Commission Accuracy**:
   - 100% accuracy in commission calculations
   - Correct MLM level assignments
   - All transactions auditable

3. **Balance Management**:
   - 50/50 rule enforced correctly
   - Instant portion transfers immediately
   - Locked portion unlocks exactly 7 days later
   - No balance discrepancies

4. **Performance**:
   - Application approval: < 1 second
   - Redemption processing: < 2 seconds
   - Dashboard load time: < 1 second
   - Commission calculation: < 500ms per event

5. **Security**:
   - No self-referrals possible
   - IP duplicate detection
   - Fraud patterns flagged for review
   - Admin approval required for large commissions

---

## 🔗 Related Documentation

- `ENHANCED_AFFILIATE_SYSTEM_DOCUMENTATION.md` - Existing system docs
- `AFFILIATE_SYSTEM_GUIDE.md` - User guide
- `COMPLETE_AFFILIATE_SYSTEM_IMPLEMENTATION.md` - Implementation details
- `migration-add-affiliate-system.sql` - Database schema
- `migration-enhance-affiliate-mlm.sql` - MLM enhancements

---

## 📞 Questions for Clarification

1. **Commission Approval**: Should small commissions (<$10) be auto-approved, or all require manual review?

2. **Redemption Minimum**: What's the minimum redemption amount? (e.g., $10, $50?)

3. **Application Review**: Who can approve applications? Admin only, or also Managers?

4. **Unlock Timing**: 50/50 rule - should it be exactly 7 days, or configurable per affiliate/tier?

5. **MLM Depth**: Currently supports 3 levels. Do you want more levels or is 3 sufficient?

6. **Commission Types**: Which events trigger commissions?
   - First deposit only? ✓
   - All deposits?
   - Bet losses? ✓
   - Net gaming revenue (GGR)? ✓
   - Withdrawals (negative commission)?

7. **Currency**: Should affiliate balance be in USD or user's currency?

8. **Tax/Compliance**: Any tax withholding or compliance requirements for affiliate payouts?

---

**This plan provides a complete roadmap for enhancing your existing affiliate system to meet your specific requirements while maintaining compatibility with the existing architecture.**
