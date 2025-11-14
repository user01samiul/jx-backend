# 🎯 Enhanced Affiliate System Documentation

## Overview

The JackpotX Enhanced Affiliate System is a comprehensive MLM (Multi-Level Marketing) solution designed specifically for casino operations. It provides professional affiliate management, marketing partner roles, and sophisticated commission tracking based on user betting activity and revenue.

## 🏗️ System Architecture

### Core Components

1. **Enhanced Affiliate Service** (`src/services/affiliate/enhanced-affiliate.service.ts`)
   - MLM structure management
   - Advanced commission calculations
   - Bet revenue tracking
   - Downline management

2. **Enhanced Affiliate Controller** (`src/api/affiliate/enhanced-affiliate.controller.ts`)
   - Affiliate portal endpoints
   - Admin management endpoints
   - Manager dashboard endpoints
   - Referral tracking endpoints

3. **Admin Management Controller** (`src/api/admin/enhanced-affiliate-admin.controller.ts`)
   - Comprehensive admin oversight
   - System settings management
   - Analytics and reporting
   - Commission payout processing

4. **Database Structure**
   - Enhanced `affiliate_profiles` table with MLM fields
   - `affiliate_commissions` with level tracking
   - `affiliate_teams` for team management
   - `manager_permissions` for role-based access

## 🎭 Role-Based Access Control

### Available Roles

1. **Admin** - Full system access and oversight
2. **Affiliate** - Standard affiliate marketing partner
3. **Affiliates Manager** - Manages affiliate teams
4. **Influencer** - Special affiliate type for influencers

### Role Permissions

| Feature | Admin | Affiliate | Manager | Influencer |
|---------|-------|-----------|---------|------------|
| View affiliate dashboard | ✅ | ✅ | ✅ | ✅ |
| Create affiliate profiles | ✅ | ❌ | ✅ | ❌ |
| Manage teams | ✅ | ❌ | ✅ | ❌ |
| Process payouts | ✅ | ❌ | ❌ | ❌ |
| View system analytics | ✅ | ❌ | Limited | ❌ |
| Update commission rates | ✅ | ❌ | Limited | ❌ |

## 💰 Commission Structure

### MLM Commission Levels

1. **Level 1 (Direct Referrals)** - 5% commission
2. **Level 2 (Indirect Referrals)** - 2% commission  
3. **Level 3 (Third Level)** - 1% commission

### Commission Types

1. **Deposit Commission** - 10% of first deposit
2. **Bet Revenue Commission** - 3% of net gaming revenue
3. **Loss Commission** - 5% of user losses
4. **Net Gaming Revenue** - Based on casino profit

### Commission Calculation Example

```
User A refers User B (Level 1)
User B refers User C (Level 2 for A, Level 1 for B)
User C refers User D (Level 3 for A, Level 2 for B, Level 1 for C)

When User D deposits $100:
- User A gets: $5 (Level 3: 1% of $100)
- User B gets: $2 (Level 2: 2% of $100)  
- User C gets: $5 (Level 1: 5% of $100)
```

## 🌐 API Endpoints

### Affiliate Portal Endpoints

#### Profile Management

```http
POST /api/enhanced-affiliate/profile
Authorization: Bearer <affiliate_token>
Content-Type: application/json

{
  "profileData": {
    "display_name": "My Affiliate Brand",
    "website_url": "https://mywebsite.com",
    "social_media_links": {
      "facebook": "https://facebook.com/mybrand",
      "instagram": "https://instagram.com/mybrand"
    },
    "commission_rate": 5.0,
    "minimum_payout": 50.0,
    "payment_methods": ["bank_transfer", "paypal"]
  },
  "uplineReferralCode": "ABC123" // Optional
}
```

#### Dashboard & Analytics

```http
GET /api/enhanced-affiliate/dashboard
Authorization: Bearer <affiliate_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 1,
      "user_id": 123,
      "referral_code": "XYZ789",
      "display_name": "My Affiliate Brand",
      "commission_rate": 5.0,
      "total_referrals": 25,
      "total_commission_earned": 1250.50,
      "level": 1,
      "downline_count": 8,
      "total_downline_commission": 450.75
    },
    "mlm_structure": {
      "affiliate_id": 123,
      "level": 1,
      "upline_id": 456,
      "downline_ids": [789, 101, 102],
      "direct_referrals": 25,
      "indirect_referrals": 15
    },
    "commission_stats": {
      "total_commissions": 45,
      "total_commission_earned": 1250.50,
      "pending_commission": 350.75,
      "paid_commission": 899.75
    },
    "recent_referrals": [...],
    "recent_commissions": [...],
    "monthly_stats": {
      "new_referrals": 5,
      "commission_earned": 250.00,
      "conversions": 8
    }
  }
}
```

#### MLM Structure

```http
GET /api/enhanced-affiliate/mlm-structure
Authorization: Bearer <affiliate_token>
```

#### Commission Calculations

```http
POST /api/enhanced-affiliate/calculate-bet-revenue
Authorization: Bearer <affiliate_token>
Content-Type: application/json

{
  "referredUserId": 456,
  "periodStart": "2024-01-01T00:00:00Z",
  "periodEnd": "2024-01-31T23:59:59Z"
}
```

```http
POST /api/enhanced-affiliate/calculate-mlm-commissions
Authorization: Bearer <affiliate_token>
Content-Type: application/json

{
  "referredUserId": 456,
  "transactionId": 789,
  "amount": 100.00,
  "commissionType": "deposit"
}
```

### Admin Management Endpoints

#### System Overview

```http
GET /api/enhanced-affiliate/admin/dashboard
Authorization: Bearer <admin_token>
```

#### Affiliate Management

```http
GET /api/enhanced-affiliate/admin/affiliates?page=1&limit=20&status=active&team_id=1
Authorization: Bearer <admin_token>
```

```http
POST /api/enhanced-affiliate/admin/affiliates
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": 123,
  "profileData": {
    "display_name": "New Affiliate",
    "commission_rate": 5.0,
    "minimum_payout": 50.0
  },
  "uplineReferralCode": "ABC123",
  "managerId": 456,
  "teamId": 1
}
```

```http
PUT /api/enhanced-affiliate/admin/affiliates/123
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "display_name": "Updated Affiliate Name",
  "commission_rate": 7.5,
  "is_active": true,
  "manager_id": 456,
  "team_id": 1
}
```

#### Analytics & Reporting

```http
GET /api/enhanced-affiliate/admin/affiliates/123/analytics?period=30
Authorization: Bearer <admin_token>
```

```http
GET /api/enhanced-affiliate/admin/affiliates/123/mlm-structure?maxDepth=3
Authorization: Bearer <admin_token>
```

#### Commission Payout Processing

```http
POST /api/enhanced-affiliate/admin/affiliates/123/payout
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "commissionIds": [1, 2, 3, 4, 5],
  "paymentMethod": "bank_transfer",
  "paymentReference": "PAY-2024-001",
  "notes": "Monthly payout for January 2024"
}
```

#### System Settings

```http
GET /api/enhanced-affiliate/admin/settings
Authorization: Bearer <admin_token>
```

```http
PUT /api/enhanced-affiliate/admin/settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "commissionRates": {
    "level_1": 5.0,
    "level_2": 2.0,
    "level_3": 1.0,
    "bet_revenue": 3.0,
    "deposit": 10.0
  },
  "teamSettings": [
    {
      "id": 1,
      "team_commission_rate": 6.0,
      "team_goals": {
        "monthly_referrals": 100,
        "monthly_commission": 5000
      }
    }
  ]
}
```

### Manager Endpoints

#### Manager Dashboard

```http
GET /api/enhanced-affiliate/manager/dashboard
Authorization: Bearer <manager_token>
```

#### Team Management

```http
GET /api/enhanced-affiliate/manager/teams/1/affiliates?page=1&limit=20
Authorization: Bearer <manager_token>
```

### Referral Tracking Endpoints

#### Track Referral Click

```http
POST /api/enhanced-affiliate/track-referral
Content-Type: application/json

{
  "referralCode": "ABC123",
  "visitorIp": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "landingPage": "/register?ref=ABC123",
  "sessionId": "sess_123456"
}
```

#### Record Conversion

```http
POST /api/enhanced-affiliate/record-conversion
Content-Type: application/json

{
  "referralCode": "ABC123",
  "conversionType": "registration",
  "convertedUserId": 456,
  "conversionAmount": 100.00
}
```

## 🗄️ Database Schema

### Enhanced Affiliate Profiles Table

```sql
CREATE TABLE affiliate_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  website_url VARCHAR(255),
  social_media_links JSONB,
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  minimum_payout NUMERIC(20,2) DEFAULT 50.00,
  payment_methods JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  total_referrals INTEGER DEFAULT 0,
  total_commission_earned NUMERIC(20,2) DEFAULT 0,
  total_payouts_received NUMERIC(20,2) DEFAULT 0,
  manager_id INTEGER REFERENCES users(id),
  team_id INTEGER REFERENCES affiliate_teams(id),
  level INTEGER DEFAULT 1, -- MLM level
  upline_id INTEGER REFERENCES users(id), -- Direct upline
  downline_count INTEGER DEFAULT 0,
  total_downline_commission NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Enhanced Commissions Table

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
  level INTEGER DEFAULT 1, -- MLM level
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  paid_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Implementation Guide

### 1. Database Setup

Run the enhanced affiliate migration:

```bash
# Run the MLM enhancement migration
psql -U your_username -d your_database -f migration-enhance-affiliate-mlm.sql
```

### 2. Service Integration

The enhanced affiliate service is automatically integrated. Key features:

- **MLM Structure Management**: Automatic upline/downline tracking
- **Commission Calculation**: Multi-level commission processing
- **Bet Revenue Tracking**: Real-time commission based on user activity
- **Admin Oversight**: Comprehensive management and analytics

### 3. Role Assignment

Assign appropriate roles to users:

```sql
-- Assign affiliate role
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.username = 'affiliate_user' AND r.name = 'Affiliate';

-- Assign manager role
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.username = 'manager_user' AND r.name = 'Affiliates Manager';
```

### 4. Commission Triggers

The system automatically calculates commissions when:

- User makes first deposit
- User places bets (bet revenue commission)
- User experiences losses
- Monthly NGR calculations

### 5. MLM Structure Management

The system automatically:

- Tracks upline/downline relationships
- Calculates multi-level commissions
- Updates downline counts
- Manages commission distribution

## 📊 Analytics & Reporting

### Key Metrics

1. **Affiliate Performance**
   - Total referrals per affiliate
   - Conversion rates
   - Commission earned (direct + downline)
   - MLM level performance

2. **Team Performance**
   - Team commission totals
   - Average earnings per affiliate
   - Team conversion rates
   - Manager performance

3. **System Performance**
   - Overall affiliate revenue
   - Commission distribution by level
   - Payout processing efficiency
   - MLM structure health

### Available Reports

1. **Affiliate Dashboard**: Individual affiliate performance
2. **Manager Dashboard**: Team management and oversight
3. **Admin Dashboard**: System-wide analytics and management
4. **MLM Structure Report**: Hierarchical performance analysis
5. **Commission Reports**: Detailed commission tracking
6. **Payout Reports**: Payment processing and history

## 🔒 Security Features

1. **Role-Based Access Control**: Different interfaces for different roles
2. **Commission Validation**: Prevents duplicate commission calculations
3. **MLM Integrity**: Ensures proper upline/downline relationships
4. **Audit Logging**: All affiliate actions are logged
5. **Data Encryption**: Sensitive data encrypted in transit and at rest

## 🚀 Deployment Checklist

- [ ] Run database migration
- [ ] Verify all API endpoints
- [ ] Test role-based access
- [ ] Configure commission rates
- [ ] Set up MLM structure
- [ ] Test commission calculations
- [ ] Verify payout system
- [ ] Test admin management
- [ ] Configure email notifications
- [ ] Set up monitoring and logging

## 📞 Support & Maintenance

### Common Operations

1. **Adding New Affiliate**
   ```sql
   -- Create affiliate profile
   INSERT INTO affiliate_profiles (user_id, referral_code, display_name)
   VALUES (123, 'ABC123', 'New Affiliate');
   
   -- Assign affiliate role
   INSERT INTO user_roles (user_id, role_id)
   SELECT 123, id FROM roles WHERE name = 'Affiliate';
   ```

2. **Updating Commission Rates**
   ```sql
   UPDATE affiliate_profiles 
   SET commission_rate = 7.5 
   WHERE user_id = 123;
   ```

3. **Processing Payouts**
   ```sql
   -- Update commission status
   UPDATE affiliate_commissions 
   SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
   WHERE id IN (1, 2, 3, 4, 5);
   
   -- Create payout record
   INSERT INTO affiliate_payouts (affiliate_id, total_amount, commission_ids)
   VALUES (123, 250.00, ARRAY[1, 2, 3, 4, 5]);
   ```

### Monitoring

- **Daily**: Monitor commission calculations
- **Weekly**: Review affiliate performance
- **Monthly**: Generate comprehensive reports
- **Quarterly**: Update commission rates and policies

---

## 🎉 Conclusion

The Enhanced Affiliate System provides a complete MLM solution for casino operations with:

- **Professional Management**: Separate interfaces for different roles
- **MLM Structure**: Multi-level commission tracking
- **Bet Revenue Integration**: Real-time commission based on user activity
- **Admin Oversight**: Comprehensive management and analytics
- **Scalable Architecture**: Designed for high-volume casino operations

For additional support or customization requests, please refer to the API documentation or contact the development team. 