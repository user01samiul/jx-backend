# 🎯 Affiliate System Implementation Guide

## Overview

The JackpotX Affiliate System is a comprehensive solution that enables affiliate marketing with commission tracking, dashboard analytics, and admin management capabilities. This guide provides complete implementation instructions for both backend and frontend integration.

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Setup](#database-setup)
3. [Backend Implementation](#backend-implementation)
4. [API Endpoints](#api-endpoints)
5. [Admin Panel Integration](#admin-panel-integration)
6. [Affiliate Portal Features](#affiliate-portal-features)
7. [Commission Tracking](#commission-tracking)
8. [Testing & Deployment](#testing--deployment)

## 🏗️ System Architecture

### Core Components

1. **Affiliate Service** (`src/services/affiliate/affiliate.service.ts`)
   - Profile management
   - Commission tracking
   - Dashboard analytics
   - Payout processing

2. **Database Tables**
   - `affiliate_profiles` - Affiliate account information
   - `affiliate_relationships` - Referral tracking
   - `affiliate_commissions` - Commission records
   - `affiliate_payouts` - Payout management
   - `affiliate_tracking` - Click/conversion tracking
   - `affiliate_marketing_materials` - Marketing assets

3. **API Endpoints**
   - `/api/affiliate/*` - Affiliate portal endpoints
   - `/api/admin/roles/*` - Role management
   - `/api/admin/affiliates/*` - Admin affiliate management

## 🗄️ Database Setup

### 1. Run Migration

Execute the affiliate system migration:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database

# Run the migration
\i migration-add-affiliate-system.sql
```

### 2. Verify Tables

Check that all tables were created successfully:

```sql
-- Check affiliate tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'affiliate_%';

-- Check roles
SELECT * FROM roles WHERE name IN ('Affiliate', 'Influencer');
```

### 3. Sample Data

The migration includes sample marketing materials and role creation. Verify:

```sql
-- Check marketing materials
SELECT * FROM affiliate_marketing_materials;

-- Check roles
SELECT * FROM roles ORDER BY id;
```

## 🔧 Backend Implementation

### 1. File Structure

```
src/
├── services/
│   └── affiliate/
│       └── affiliate.service.ts
├── api/
│   └── affiliate/
│       ├── affiliate.schema.ts
│       └── affiliate.controller.ts
├── routes/
│   └── affiliate.routes.ts
└── app.ts (updated with affiliate routes)
```

### 2. Service Integration

The affiliate service is already integrated into the main application. Key features:

- **Profile Management**: Create, update, and manage affiliate profiles
- **Commission Tracking**: Automatic commission calculation and tracking
- **Dashboard Analytics**: Real-time statistics and reporting
- **Payout Processing**: Request and manage affiliate payouts

### 3. Role-Based Access

The system uses role-based authentication:

- **Affiliate Role**: Access to affiliate portal
- **Admin Role**: Access to admin management
- **Influencer Role**: Special affiliate type for influencers

## 🌐 API Endpoints

### Affiliate Portal Endpoints

#### Profile Management

```http
# Create affiliate profile
POST /api/affiliate/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "display_name": "My Affiliate Brand",
  "website_url": "https://mywebsite.com",
  "social_media_links": {
    "facebook": "https://facebook.com/mybrand",
    "instagram": "https://instagram.com/mybrand"
  },
  "commission_rate": 5.0,
  "minimum_payout": 50.0,
  "payment_methods": ["bank_transfer", "paypal"]
}
```

```http
# Get affiliate profile
GET /api/affiliate/profile
Authorization: Bearer <token>
```

```http
# Update affiliate profile
PUT /api/affiliate/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "display_name": "Updated Brand Name",
  "commission_rate": 7.5
}
```

#### Dashboard Analytics

```http
# Get affiliate dashboard
GET /api/affiliate/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_referrals": 25,
    "active_referrals": 18,
    "total_commission_earned": 1250.50,
    "pending_commission": 350.75,
    "total_payouts_received": 899.75,
    "available_for_payout": 350.75,
    "monthly_stats": {
      "new_referrals": 5,
      "commission_earned": 250.00,
      "conversions": 8
    },
    "recent_referrals": [...],
    "recent_commissions": [...],
    "recent_payouts": [...]
  }
}
```

#### Commission Management

```http
# Get commissions with filtering
GET /api/affiliate/commissions?status=pending&page=1&limit=20
Authorization: Bearer <token>
```

```http
# Request payout
POST /api/affiliate/payouts
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 250.00,
  "payment_method": "bank_transfer"
}
```

#### Marketing Materials

```http
# Get marketing materials
GET /api/affiliate/marketing-materials
Authorization: Bearer <token>
```

### Admin Management Endpoints

#### Role Management

```http
# Get all roles
GET /api/admin/roles
Authorization: Bearer <admin_token>
```

```http
# Create new role
POST /api/admin/roles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Premium Affiliate",
  "description": "High-performing affiliate with enhanced commission rates",
  "permissions": {
    "can_access_advanced_analytics": true,
    "can_request_priority_payouts": true
  }
}
```

```http
# Update role
PUT /api/admin/roles/10
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "description": "Updated description",
  "permissions": {
    "can_access_advanced_analytics": true,
    "can_request_priority_payouts": true,
    "can_access_exclusive_materials": true
  }
}
```

#### User Role Assignment

```http
# Get user roles
GET /api/admin/users/123/roles
Authorization: Bearer <admin_token>
```

```http
# Assign role to user
POST /api/admin/users/123/roles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role_id": 9
}
```

```http
# Remove role from user
DELETE /api/admin/users/123/roles/9
Authorization: Bearer <admin_token>
```

## 🎛️ Admin Panel Integration

### 1. Role Management Interface

Create a role management section in your admin panel:

```javascript
// Role Management Component
const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await response.json();
      setRoles(data.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRole = async (roleData) => {
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      });
      const data = await response.json();
      if (data.success) {
        fetchRoles(); // Refresh list
      }
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  return (
    <div className="role-management">
      <h2>Role Management</h2>
      
      {/* Role List */}
      <div className="role-list">
        {roles.map(role => (
          <div key={role.id} className="role-item">
            <h3>{role.name}</h3>
            <p>{role.description}</p>
            <div className="role-actions">
              <button onClick={() => editRole(role.id)}>Edit</button>
              <button onClick={() => deleteRole(role.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Role Form */}
      <div className="create-role-form">
        <h3>Create New Role</h3>
        <form onSubmit={handleCreateRole}>
          <input 
            type="text" 
            placeholder="Role Name" 
            name="name" 
            required 
          />
          <textarea 
            placeholder="Description" 
            name="description" 
            required 
          />
          <button type="submit">Create Role</button>
        </form>
      </div>
    </div>
  );
};
```

### 2. User Role Assignment Interface

```javascript
// User Role Assignment Component
const UserRoleAssignment = ({ userId }) => {
  const [userRoles, setUserRoles] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');

  const fetchUserRoles = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await response.json();
      setUserRoles(data.data);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const assignRole = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role_id: parseInt(selectedRole) })
      });
      const data = await response.json();
      if (data.success) {
        fetchUserRoles(); // Refresh list
        setSelectedRole('');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
    }
  };

  return (
    <div className="user-role-assignment">
      <h3>User Roles</h3>
      
      {/* Current Roles */}
      <div className="current-roles">
        <h4>Assigned Roles</h4>
        {userRoles.map(role => (
          <div key={role.id} className="role-badge">
            <span>{role.name}</span>
            <button onClick={() => removeRole(role.id)}>Remove</button>
          </div>
        ))}
      </div>

      {/* Assign New Role */}
      <div className="assign-role">
        <h4>Assign New Role</h4>
        <select 
          value={selectedRole} 
          onChange={(e) => setSelectedRole(e.target.value)}
        >
          <option value="">Select Role</option>
          {availableRoles.map(role => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <button onClick={assignRole} disabled={!selectedRole}>
          Assign Role
        </button>
      </div>
    </div>
  );
};
```

### 3. Affiliate Management Dashboard

```javascript
// Affiliate Management Component
const AffiliateManagement = () => {
  const [affiliates, setAffiliates] = useState([]);
  const [stats, setStats] = useState({});

  const fetchAffiliateStats = async () => {
    try {
      const response = await fetch('/api/admin/affiliate-stats', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
    }
  };

  return (
    <div className="affiliate-management">
      <h2>Affiliate Management</h2>
      
      {/* Statistics Dashboard */}
      <div className="stats-dashboard">
        <div className="stat-card">
          <h3>Total Affiliates</h3>
          <p>{stats.total_affiliates || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Active Affiliates</h3>
          <p>{stats.active_affiliates || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Referrals</h3>
          <p>{stats.total_referrals || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Commission Paid</h3>
          <p>${stats.total_commission_paid || 0}</p>
        </div>
      </div>

      {/* Affiliate List */}
      <div className="affiliate-list">
        <h3>Affiliate Partners</h3>
        {/* Affiliate list implementation */}
      </div>
    </div>
  );
};
```

## 🎯 Affiliate Portal Features

### 1. Dashboard Overview

The affiliate dashboard provides:

- **Real-time Statistics**: Total referrals, active users, commission earned
- **Monthly Performance**: New referrals, commission earned, conversions
- **Recent Activity**: Latest referrals, commissions, and payouts
- **Quick Actions**: Request payout, view marketing materials

### 2. Commission Tracking

- **Commission Types**: Deposit, bet, loss, net gaming revenue
- **Status Tracking**: Pending, approved, paid, cancelled
- **Filtering Options**: By date, type, status
- **Export Capabilities**: Download commission reports

### 3. Referral Management

- **Referral List**: All users referred by the affiliate
- **Performance Metrics**: First deposit amounts, total wagered
- **Status Tracking**: Active, inactive, suspended
- **Conversion Tracking**: Registration to deposit conversion rates

### 4. Marketing Materials

- **Banners**: Various sizes and formats
- **Text Links**: Pre-formatted affiliate links
- **Email Templates**: Ready-to-use marketing content
- **Landing Pages**: Custom affiliate landing pages

### 5. Payout System

- **Payout Requests**: Submit payout requests
- **Payment Methods**: Multiple payment options
- **Minimum Thresholds**: Configurable minimum payout amounts
- **Status Tracking**: Pending, processing, completed, failed

## 💰 Commission Tracking

### Commission Calculation

The system automatically calculates commissions based on:

1. **Deposit Commissions**: Percentage of user deposits
2. **Bet Commissions**: Percentage of user betting activity
3. **Loss Commissions**: Percentage of user losses
4. **Net Gaming Revenue**: Percentage of NGR

### Commission Triggers

Commissions are triggered automatically when:

- User makes first deposit
- User places bets
- User experiences losses
- Monthly NGR calculations

### Commission Rates

- **Default Rate**: 5% (configurable per affiliate)
- **Tiered Rates**: Based on performance
- **Special Rates**: For influencers and partners

## 🧪 Testing & Deployment

### 1. Database Testing

```sql
-- Test affiliate profile creation
INSERT INTO affiliate_profiles (user_id, referral_code, display_name) 
VALUES (1, 'TEST123', 'Test Affiliate');

-- Test commission calculation
SELECT calculate_affiliate_commission(1, 2, 1, 100.00, 'deposit');

-- Test referral tracking
INSERT INTO affiliate_relationships (affiliate_id, referred_user_id, referral_code)
VALUES (1, 3, 'TEST123');
```

### 2. API Testing

```bash
# Test affiliate profile creation
curl -X POST http://localhost:3000/api/affiliate/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Test Affiliate",
    "website_url": "https://test.com",
    "commission_rate": 5.0
  }'

# Test dashboard access
curl -X GET http://localhost:3000/api/affiliate/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test role management
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Role",
    "description": "Test role description"
  }'
```

### 3. Frontend Testing

```javascript
// Test affiliate dashboard
const testAffiliateDashboard = async () => {
  try {
    const response = await fetch('/api/affiliate/dashboard', {
      headers: {
        'Authorization': `Bearer ${affiliateToken}`
      }
    });
    const data = await response.json();
    console.log('Dashboard data:', data);
  } catch (error) {
    console.error('Dashboard test failed:', error);
  }
};

// Test role assignment
const testRoleAssignment = async (userId, roleId) => {
  try {
    const response = await fetch(`/api/admin/users/${userId}/roles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role_id: roleId })
    });
    const data = await response.json();
    console.log('Role assignment result:', data);
  } catch (error) {
    console.error('Role assignment test failed:', error);
  }
};
```

### 4. Deployment Checklist

- [ ] Run database migration
- [ ] Verify all API endpoints
- [ ] Test role-based access
- [ ] Configure commission rates
- [ ] Set up marketing materials
- [ ] Test affiliate tracking
- [ ] Verify payout system
- [ ] Test admin management
- [ ] Configure email notifications
- [ ] Set up monitoring and logging

## 📊 Monitoring & Analytics

### Key Metrics to Track

1. **Affiliate Performance**
   - Total referrals per affiliate
   - Conversion rates
   - Commission earned
   - Payout frequency

2. **System Performance**
   - API response times
   - Database query performance
   - Error rates
   - User engagement

3. **Business Metrics**
   - Total affiliate revenue
   - Cost per acquisition
   - Return on investment
   - Affiliate retention rates

### Logging

```javascript
// Add logging to affiliate service
console.log('[AFFILIATE] Profile created:', { userId, profileData });
console.log('[AFFILIATE] Commission calculated:', { affiliateId, amount, commission });
console.log('[AFFILIATE] Payout requested:', { affiliateId, amount, method });
```

## 🔒 Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Role-based access control
3. **Input Validation**: All inputs validated using Zod schemas
4. **Rate Limiting**: API rate limiting to prevent abuse
5. **Data Encryption**: Sensitive data encrypted in transit and at rest
6. **Audit Logging**: All affiliate actions logged for compliance

## 📞 Support & Maintenance

### Common Issues

1. **Commission Not Calculating**
   - Check affiliate relationship status
   - Verify commission rates
   - Check transaction status

2. **Payout Issues**
   - Verify minimum payout threshold
   - Check payment method configuration
   - Review payout status

3. **Role Assignment Problems**
   - Verify user and role exist
   - Check for duplicate assignments
   - Review role permissions

### Maintenance Tasks

- **Daily**: Monitor commission calculations
- **Weekly**: Review affiliate performance
- **Monthly**: Generate affiliate reports
- **Quarterly**: Update commission rates and policies

---

## 🎉 Conclusion

The JackpotX Affiliate System provides a complete solution for affiliate marketing with comprehensive tracking, analytics, and management capabilities. Follow this guide to implement and maintain a successful affiliate program.

For additional support or customization requests, please refer to the API documentation or contact the development team. 