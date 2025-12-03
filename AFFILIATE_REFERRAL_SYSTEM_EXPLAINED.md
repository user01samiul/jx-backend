# 🎯 **HOW THE AFFILIATE & REFERRAL SYSTEM WORKS**

## 📊 **System Architecture Overview**

Your affiliate system has **3 main components**:

### **1. AFFILIATES (The Marketers)**
### **2. REFERRALS (People they bring in)**
### **3. COMMISSIONS (Money they earn)**

---

## 🔄 **The Complete Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    AFFILIATE SYSTEM FLOW                     │
└─────────────────────────────────────────────────────────────┘

1. USER BECOMES AFFILIATE
   ↓
2. AFFILIATE GETS REFERRAL CODE
   ↓
3. AFFILIATE SHARES REFERRAL LINK
   ↓
4. NEW USER CLICKS LINK (Tracked in affiliate_tracking)
   ↓
5. NEW USER REGISTERS (Tracked in affiliate_tracking)
   ↓
6. RELATIONSHIP CREATED (affiliate_relationships table)
   ↓
7. REFERRED USER MAKES DEPOSIT/BETS
   ↓
8. COMMISSION CREATED (affiliate_commissions table)
   ↓
9. AFFILIATE GETS PAID
```

---

## 📁 **Database Tables Explained**

### **1. `affiliate_profiles` - The Affiliate's Profile**

This is the **AFFILIATE** (the marketer).

**Schema:**
```sql
CREATE TABLE affiliate_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  website_url VARCHAR(255),
  social_media_links JSONB,
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  minimum_payout NUMERIC(20,2) DEFAULT 50.00,
  total_referrals INTEGER DEFAULT 0,
  total_commission_earned NUMERIC(20,2) DEFAULT 0,
  total_payouts_received NUMERIC(20,2) DEFAULT 0,
  upline_id INTEGER REFERENCES users(id),
  level INTEGER DEFAULT 1,
  downline_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields Explained:**
- `id`: Unique affiliate profile ID
- `user_id`: Links to users table (so users can become affiliates)
- `referral_code`: "AFF123456" (unique code for sharing)
- `display_name`: Public name for the affiliate
- `commission_rate`: 5% default (can be customized per affiliate)
- `total_referrals`: Count of people they referred
- `total_commission_earned`: Total money earned (all-time)
- `upline_id`: Their parent affiliate (for MLM structure)
- `level`: 1, 2, 3 (MLM hierarchy depth)
- `downline_count`: Number of people below them in MLM

**Example Record:**
```json
{
  "id": 1,
  "user_id": 56,
  "referral_code": "AFF123456",
  "display_name": "John's Affiliates",
  "commission_rate": 5.0,
  "minimum_payout": 50.00,
  "total_referrals": 25,
  "total_commission_earned": 1250.50,
  "total_payouts_received": 1000.00,
  "upline_id": null,
  "level": 1,
  "downline_count": 10,
  "is_active": true
}
```

---

### **2. `affiliate_relationships` - Who Referred Who**

This table tracks **THE REFERRALS** (people who were referred by affiliates).

**Schema:**
```sql
CREATE TABLE affiliate_relationships (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  status VARCHAR(20) DEFAULT 'active',
  level INTEGER DEFAULT 1,
  is_indirect BOOLEAN DEFAULT false,
  first_deposit_amount NUMERIC(20,2) DEFAULT 0,
  first_deposit_date TIMESTAMPTZ,
  total_commission_earned NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(affiliate_id, referred_user_id)
);
```

**Fields Explained:**
- `id`: Unique relationship ID
- `affiliate_id`: Who referred them (user_id from affiliate_profiles)
- `referred_user_id`: The new user who was referred
- `referral_code`: Code used during registration
- `level`: 1 (direct), 2 (sub-affiliate), 3 (sub-sub), etc.
- `first_deposit_amount`: Their first deposit amount
- `total_commission_earned`: How much the affiliate earned from THIS specific referral
- `status`: active/inactive/suspended

**Example Record:**
```json
{
  "id": 1,
  "affiliate_id": 56,           // John (affiliate)
  "referred_user_id": 789,       // Player123 (referred by John)
  "referral_code": "AFF123456",
  "level": 1,                    // Direct referral
  "first_deposit_amount": 500.00,
  "first_deposit_date": "2025-11-15T10:00:00Z",
  "total_commission_earned": 125.00,
  "status": "active"
}
```

**💡 KEY INSIGHT:** "REFERRALS" = Rows in `affiliate_relationships` table!

---

### **3. `affiliate_commissions` - Money Earned**

This table tracks **every individual commission transaction**.

**Schema:**
```sql
CREATE TABLE affiliate_commissions (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  commission_amount NUMERIC(20,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  base_amount NUMERIC(20,2) NOT NULL,
  commission_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  level INTEGER DEFAULT 1,
  paid_at TIMESTAMPTZ,
  paid_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields Explained:**
- `id`: Commission transaction ID
- `affiliate_id`: Who earned this commission
- `referred_user_id`: Which referral generated it
- `transaction_id`: The deposit/bet that triggered this commission
- `commission_amount`: $25.00 (how much affiliate earned)
- `base_amount`: $500.00 (original transaction amount)
- `commission_rate`: 5% (rate used for calculation)
- `commission_type`: deposit/bet/loss/net_gaming_revenue
- `status`: pending/approved/paid/cancelled
- `level`: 1 (direct), 2 (MLM sub-level commission)

**Example Record:**
```json
{
  "id": 10,
  "affiliate_id": 56,            // John earned this
  "referred_user_id": 789,        // From Player123's activity
  "transaction_id": 5000,         // Deposit transaction
  "commission_amount": 25.00,     // John gets $25
  "base_amount": 500.00,          // Player123 deposited $500
  "commission_rate": 5.0,         // 5% commission
  "commission_type": "deposit",
  "status": "approved",
  "level": 1,
  "created_at": "2025-12-01T10:00:00Z"
}
```

---

### **4. `affiliate_tracking` - Click & Conversion Tracking**

This table tracks **analytics BEFORE registration** (for conversion tracking).

**Schema:**
```sql
CREATE TABLE affiliate_tracking (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  visitor_ip VARCHAR(45),
  user_agent TEXT,
  landing_page VARCHAR(500),
  marketing_material_id INTEGER REFERENCES affiliate_marketing_materials(id),
  session_id VARCHAR(100),
  conversion_type VARCHAR(20),
  converted_user_id INTEGER REFERENCES users(id),
  conversion_amount NUMERIC(20,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields Explained:**
- `id`: Tracking event ID
- `affiliate_id`: Affiliate being tracked
- `referral_code`: Code in the URL (?ref=AFF123456)
- `visitor_ip`: IP address of visitor
- `landing_page`: Where they landed (full URL)
- `session_id`: Browser session identifier
- `conversion_type`: registration/deposit/first_deposit
- `converted_user_id`: If they registered, their user_id

**Example Record:**
```json
{
  "id": 100,
  "affiliate_id": 56,
  "referral_code": "AFF123456",
  "visitor_ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "landing_page": "https://jackpotx.net?ref=AFF123456",
  "session_id": "abc123session",
  "conversion_type": "registration",
  "converted_user_id": 789,
  "created_at": "2025-12-01T10:00:00Z"
}
```

---

### **5. Other Supporting Tables**

#### **`affiliate_links`** - Custom Tracking Links
```sql
-- For custom campaign tracking
- id, affiliate_id, campaign_name, target_url, short_code, clicks, conversions
```

#### **`affiliate_redemptions`** - Balance Withdrawals
```sql
-- When affiliates withdraw their commission balance
- id, user_id, amount, status, requested_at, processed_at
```

#### **`affiliate_marketing_materials`** - Promo Materials
```sql
-- Banners, links, email templates provided to affiliates
- id, name, type, content, image_url, clicks, conversions
```

---

## 🎮 **Real-World Example: John Refers Player123**

Let's walk through a complete scenario step-by-step.

### **Step 1: John Creates Affiliate Profile**

**API Call:**
```http
POST /api/affiliate/profile
Authorization: Bearer {john_token}
{
  "display_name": "John Affiliates",
  "website_url": "https://johnsgaming.com"
}
```

**Database Insert:**
```sql
INSERT INTO affiliate_profiles (
  user_id,
  referral_code,
  display_name,
  commission_rate
) VALUES (
  56,              -- John's user_id
  'AFF123456',     -- Auto-generated
  'John Affiliates',
  5.0
);
```

**Result:** John is now an affiliate with code `AFF123456`!

---

### **Step 2: John Gets His Referral Link**

**API Call:**
```http
GET /api/affiliate/profile
Authorization: Bearer {john_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "referral_code": "AFF123456",
    "referral_link": "https://jackpotx.net?ref=AFF123456"
  }
}
```

John shares this link on social media!

---

### **Step 3: Player123 Clicks John's Link**

**When Player123 visits:** `https://jackpotx.net?ref=AFF123456`

**Frontend JavaScript:**
```javascript
// Extract ref parameter
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref'); // "AFF123456"

// Save to localStorage for registration
localStorage.setItem('referral_code', refCode);

// Track the click
fetch('/api/enhanced-affiliate/track-referral', {
  method: 'POST',
  body: JSON.stringify({
    referralCode: refCode,
    visitorIp: clientIP,
    userAgent: navigator.userAgent,
    landingPage: window.location.href,
    sessionId: sessionStorage.getItem('session_id')
  })
});
```

**Database Insert:**
```sql
INSERT INTO affiliate_tracking (
  affiliate_id,
  referral_code,
  visitor_ip,
  user_agent,
  landing_page,
  session_id
) VALUES (
  56,
  'AFF123456',
  '192.168.1.1',
  'Mozilla/5.0...',
  'https://jackpotx.net?ref=AFF123456',
  'session_xyz123'
);
```

**Result:** Click tracked!

---

### **Step 4: Player123 Registers**

**Registration API Call:**
```http
POST /api/auth/register
{
  "username": "player123",
  "email": "player@email.com",
  "password": "******",
  "referral_code": "AFF123456"  // From localStorage
}
```

**Database Operations:**
```sql
-- 1. Create new user
INSERT INTO users (username, email, password)
VALUES ('player123', 'player@email.com', '$hashed_password')
RETURNING id; -- Returns 789

-- 2. Create affiliate relationship
INSERT INTO affiliate_relationships (
  affiliate_id,
  referred_user_id,
  referral_code,
  level
) VALUES (
  56,          -- John
  789,         -- Player123
  'AFF123456',
  1            -- Direct referral
);

-- 3. Update tracking with conversion
UPDATE affiliate_tracking
SET
  conversion_type = 'registration',
  converted_user_id = 789
WHERE
  referral_code = 'AFF123456'
  AND session_id = 'session_xyz123';

-- 4. Increment total_referrals counter
UPDATE affiliate_profiles
SET total_referrals = total_referrals + 1
WHERE user_id = 56;
```

**Result:** Player123 is now John's REFERRAL!

---

### **Step 5: Player123 Makes First Deposit ($500)**

**Deposit API Call:**
```http
POST /api/payment/deposit
Authorization: Bearer {player123_token}
{
  "amount": 500,
  "currency": "USD",
  "payment_method": "crypto"
}
```

**Database Operations:**
```sql
-- 1. Create transaction
INSERT INTO transactions (user_id, amount, type, status)
VALUES (789, 500.00, 'deposit', 'completed')
RETURNING id; -- Returns 5000

-- 2. Calculate commission (5% of $500 = $25)
-- 3. Create commission record
INSERT INTO affiliate_commissions (
  affiliate_id,
  referred_user_id,
  transaction_id,
  commission_amount,
  base_amount,
  commission_rate,
  commission_type,
  status,
  level
) VALUES (
  56,          -- John
  789,         -- Player123
  5000,        -- Transaction
  25.00,       -- 5% of $500
  500.00,
  5.0,
  'deposit',
  'approved',
  1
);

-- 4. Update relationship
UPDATE affiliate_relationships
SET
  first_deposit_amount = 500.00,
  first_deposit_date = NOW(),
  total_commission_earned = total_commission_earned + 25.00
WHERE affiliate_id = 56 AND referred_user_id = 789;

-- 5. Update affiliate profile totals
UPDATE affiliate_profiles
SET total_commission_earned = total_commission_earned + 25.00
WHERE user_id = 56;

-- 6. Update tracking conversion
UPDATE affiliate_tracking
SET
  conversion_type = 'first_deposit',
  conversion_amount = 500.00
WHERE converted_user_id = 789;
```

**Result:** John earned **$25 commission**!

---

### **Step 6: Player123 Bets $1000 (Loses $200)**

**After betting session:**

**Database Operations:**
```sql
-- Calculate commission on net gaming revenue
-- NGR = Bets - Wins = $1000 - $800 = $200
-- Commission = 5% of $200 = $10

INSERT INTO affiliate_commissions (
  affiliate_id,
  referred_user_id,
  transaction_id,
  commission_amount,
  base_amount,
  commission_rate,
  commission_type,
  status,
  level
) VALUES (
  56,
  789,
  5001,
  10.00,       -- 5% of $200 NGR
  200.00,      -- NGR
  5.0,
  'net_gaming_revenue',
  'pending',
  1
);

UPDATE affiliate_profiles
SET total_commission_earned = total_commission_earned + 10.00
WHERE user_id = 56;
```

**Result:** John earned another **$10 commission**!

**John's Total Earnings from Player123:** $25 + $10 = **$35**

---

## 🏆 **MLM (Multi-Level Marketing) System**

Your system supports **multi-level referrals** where affiliates can refer other affiliates!

### **Structure Example:**

```
John (Level 1 Affiliate - user_id: 56)
├── Player123 (Direct Referral)
│   └── Deposits $500 → John gets $25
├── Player456 (Direct Referral)
│   └── Deposits $300 → John gets $15
└── Sarah (Level 2 Affiliate - referred by John)
    ├── Player789 (Sarah's Direct Referral)
    │   └── Deposits $200
    │       ├── Sarah gets $10 (Level 1 commission - 5%)
    │       └── John gets $2 (Level 2 commission - 1% override)
    └── Player999 (Sarah's Direct Referral)
        └── Deposits $100
            ├── Sarah gets $5
            └── John gets $1
```

### **How It Works:**

1. **John refers Sarah** with code `AFF123456`
2. **Sarah becomes an affiliate** with code `AFF789XYZ`
3. **Sarah's profile:**
   ```sql
   upline_id = 56     -- John is Sarah's upline
   level = 2          -- Sarah is level 2
   ```
4. **When Sarah refers Player789:**
   ```sql
   -- Relationship created
   affiliate_relationships:
   - affiliate_id = sarah_user_id
   - referred_user_id = 789
   - level = 1  (direct for Sarah)

   -- Commission for Sarah (direct)
   affiliate_commissions:
   - affiliate_id = sarah_user_id
   - commission_amount = $10 (5% of $200)
   - level = 1

   -- Commission for John (MLM override)
   affiliate_commissions:
   - affiliate_id = 56 (John)
   - commission_amount = $2 (1% of $200)
   - level = 2
   ```

### **MLM Commission Rates:**
- **Level 1 (Direct):** 5%
- **Level 2 (Sub-affiliate):** 1%
- **Level 3 (Sub-sub):** 0.5%

---

## 💰 **Commission Types**

Your system supports **4 types of commissions**:

### **1. Deposit Commission**
```sql
commission_type = 'deposit'
```
- Triggered when referred user makes a deposit
- Typically 5% of deposit amount
- Example: $500 deposit → $25 commission

### **2. Bet Commission**
```sql
commission_type = 'bet'
```
- Based on total bet volume
- Example: $1000 in bets → $50 commission (if 5%)

### **3. Loss Commission**
```sql
commission_type = 'loss'
```
- Based on player's losses
- Example: Player loses $200 → $10 commission

### **4. Net Gaming Revenue (NGR)**
```sql
commission_type = 'net_gaming_revenue'
```
- Most fair: Revenue minus payouts
- Example: Player bets $1000, wins $800 → NGR = $200 → $10 commission

---

## 📊 **Commission Status Flow**

```
pending → approved → paid
        ↓
    cancelled
```

**Status Definitions:**
- `pending`: Commission calculated, awaiting admin approval
- `approved`: Admin approved, ready for payout
- `paid`: Included in payout, money sent to affiliate
- `cancelled`: Commission reversed (e.g., deposit refunded)

---

## 📈 **API Endpoints Summary**

### **User Endpoints (Affiliate Panel)**

#### **1. Get/Create Profile**
```http
GET /api/affiliate/profile
POST /api/affiliate/profile
```
Returns: `affiliate_profiles` record for current user

---

#### **2. Get Dashboard**
```http
GET /api/affiliate/dashboard
```
Returns aggregated data:
```json
{
  "total_referrals": 25,          // COUNT from affiliate_relationships
  "total_commission_earned": 1250.50,  // SUM from affiliate_commissions
  "pending_commission": 75.25,    // SUM where status='pending'
  "recent_referrals": [...],      // Recent affiliate_relationships
  "recent_commissions": [...]     // Recent affiliate_commissions
}
```

---

#### **3. Get Referrals**
```http
GET /api/affiliate/referrals?page=1&limit=20&level=1
```
Returns: Rows from `affiliate_relationships` table
```json
{
  "referrals": [
    {
      "id": 1,
      "username": "player123",
      "first_deposit_amount": 500.00,
      "total_commission_generated": 125.00,
      "status": "active",
      "registered_at": "2025-11-15T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

#### **4. Get Commissions**
```http
GET /api/affiliate/commissions?status=approved&page=1&limit=20
```
Returns: Rows from `affiliate_commissions` table
```json
{
  "commissions": [
    {
      "id": 10,
      "referred_user": "player123",
      "commission_amount": 25.00,
      "base_amount": 500.00,
      "commission_type": "deposit",
      "status": "approved",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

#### **5. Request Redemption**
```http
POST /api/affiliate/redemptions
{
  "amount": 100.00
}
```
Creates row in `affiliate_redemptions` table

---

#### **6. Get Marketing Materials**
```http
GET /api/affiliate/marketing-materials?type=banner
```
Returns: Rows from `affiliate_marketing_materials` table

---

### **Tracking Endpoints (Public)**

#### **7. Track Referral Click**
```http
POST /api/enhanced-affiliate/track-referral
{
  "referralCode": "AFF123456",
  "visitorIp": "192.168.1.1",
  "landingPage": "https://jackpotx.net?ref=AFF123456"
}
```
Inserts into `affiliate_tracking`

---

#### **8. Record Conversion**
```http
POST /api/enhanced-affiliate/record-conversion
{
  "referralCode": "AFF123456",
  "conversionType": "registration",
  "convertedUserId": 789
}
```
Updates `affiliate_tracking` with conversion data

---

## 🔍 **Database Queries Examples**

### **Get All Referrals for an Affiliate**
```sql
SELECT
  ar.id,
  u.username,
  u.email,
  ar.first_deposit_amount,
  ar.total_commission_earned,
  ar.status,
  ar.created_at as registered_at
FROM affiliate_relationships ar
JOIN users u ON u.id = ar.referred_user_id
WHERE ar.affiliate_id = 56  -- John's user_id
ORDER BY ar.created_at DESC;
```

---

### **Get All Commissions for an Affiliate**
```sql
SELECT
  ac.id,
  u.username as referred_user,
  ac.commission_amount,
  ac.base_amount,
  ac.commission_type,
  ac.status,
  ac.created_at
FROM affiliate_commissions ac
JOIN users u ON u.id = ac.referred_user_id
WHERE ac.affiliate_id = 56
ORDER BY ac.created_at DESC;
```

---

### **Calculate Total Pending Commission**
```sql
SELECT COALESCE(SUM(commission_amount), 0) as pending_commission
FROM affiliate_commissions
WHERE affiliate_id = 56 AND status = 'pending';
```

---

### **Get Conversion Rate**
```sql
SELECT
  COUNT(DISTINCT CASE WHEN conversion_type IS NOT NULL THEN session_id END) * 100.0 /
  COUNT(DISTINCT session_id) as conversion_rate
FROM affiliate_tracking
WHERE affiliate_id = 56;
```

---

## 🎯 **Summary**

### **Key Relationships:**

1. **1 User** can have **1 Affiliate Profile** (`affiliate_profiles`)
2. **1 Affiliate** can have **MANY Referrals** (`affiliate_relationships`)
3. **1 Referral** can generate **MANY Commissions** (`affiliate_commissions`)
4. **1 Affiliate** receives **MANY Payouts** (`affiliate_redemptions`)

### **The Flow:**

```
User → Becomes Affiliate → Gets Referral Code
                ↓
        Shares Link/Code
                ↓
    New Users Click & Register
                ↓
      Relationship Created (affiliate_relationships)
                ↓
    Referred Users Deposit/Bet
                ↓
      Commissions Created (affiliate_commissions)
                ↓
    Affiliate Requests Redemption
                ↓
         Gets Paid!
```

### **Important Notes:**

- **Referrals** are NOT nested inside affiliates - they're separate records linked by `affiliate_id`
- **Commissions** are individual transactions, not aggregated
- **MLM** is supported via `upline_id` and `level` fields
- **Tracking** happens before conversion (analytics)
- **Relationships** are created after registration (permanent link)

---

## 📚 **Related Files**

- `src/services/affiliate/affiliate.service.ts` - Main affiliate service
- `src/services/affiliate/enhanced-affiliate.service.ts` - MLM & advanced features
- `src/api/affiliate/affiliate.controller.ts` - API endpoints
- `src/routes/affiliate.routes.ts` - Route definitions
- `migration-affiliate-enhancement.sql` - Database schema

---

**Last Updated:** 2025-12-01
