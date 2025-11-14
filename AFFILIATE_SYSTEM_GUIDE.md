# 🎯 Affiliate System Implementation Guide

## Overview

The JackpotX Affiliate System provides complete affiliate marketing functionality with commission tracking, dashboard analytics, admin management, and **team management by Affiliates Managers**.

## 🗄️ Database Setup

Run the migration to create all necessary tables:

```bash
psql -U your_username -d your_database -f migration-add-affiliate-system.sql
```

## 🔧 Backend Implementation

### Files Created:
- `src/services/affiliate/affiliate.service.ts` - Core affiliate logic
- `src/services/affiliate/manager.service.ts` - Team management logic
- `src/api/affiliate/affiliate.schema.ts` - API validation schemas
- `src/api/affiliate/manager.schema.ts` - Manager API schemas
- `src/api/affiliate/affiliate.controller.ts` - API controllers
- `src/api/affiliate/manager.controller.ts` - Manager controllers
- `src/routes/affiliate.routes.ts` - Affiliate routes
- `src/routes/manager.routes.ts` - Manager routes

### Integration:
- Added affiliate routes to `src/app.ts`
- Added manager routes to `src/app.ts`
- Added role management to admin routes

## 🌐 Key API Endpoints

### Affiliate Portal (Requires Affiliate Role)
```http
POST /api/affiliate/profile          # Create affiliate profile
GET  /api/affiliate/profile          # Get profile
PUT  /api/affiliate/profile          # Update profile
GET  /api/affiliate/dashboard        # Get dashboard data
GET  /api/affiliate/commissions      # Get commissions
GET  /api/affiliate/payouts          # Get payouts
POST /api/affiliate/payouts          # Request payout
GET  /api/affiliate/marketing-materials # Get marketing materials
```

### Affiliates Manager Portal (Requires Affiliates Manager Role)
```http
GET  /api/manager/dashboard          # Get manager dashboard
GET  /api/manager/teams              # Get managed teams
POST /api/manager/teams              # Create new team
PUT  /api/manager/teams/:id          # Update team
GET  /api/manager/teams/:id/affiliates # Get team affiliates
GET  /api/manager/teams/:id/performance # Get team performance
POST /api/manager/assign-affiliate   # Assign affiliate to team
```

### Admin Management (Requires Admin Role)
```http
GET    /api/admin/roles              # Get all roles
POST   /api/admin/roles              # Create role
PUT    /api/admin/roles/:id          # Update role
DELETE /api/admin/roles/:id          # Delete role
GET    /api/admin/users/:id/roles    # Get user roles
POST   /api/admin/users/:id/roles    # Assign role to user
DELETE /api/admin/users/:id/roles/:roleId # Remove role
```

## 🎛️ Admin Panel Integration

### 1. Role Management
Create a role management interface in your admin panel:

```javascript
// Get all roles
const fetchRoles = async () => {
  const response = await fetch('/api/admin/roles', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  return response.json();
};

// Create new role
const createRole = async (roleData) => {
  const response = await fetch('/api/admin/roles', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(roleData)
  });
  return response.json();
};
```

### 2. User Role Assignment
```javascript
// Assign role to user
const assignRole = async (userId, roleId) => {
  const response = await fetch(`/api/admin/users/${userId}/roles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role_id: roleId })
  });
  return response.json();
};
```

## 👥 Affiliates Manager Features

### 1. Team Management
```javascript
// Get manager dashboard
const getManagerDashboard = async () => {
  const response = await fetch('/api/manager/dashboard', {
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  return response.json();
};

// Create team
const createTeam = async (teamData) => {
  const response = await fetch('/api/manager/teams', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${managerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(teamData)
  });
  return response.json();
};

// Assign affiliate to team
const assignAffiliate = async (affiliateId, teamId) => {
  const response = await fetch('/api/manager/assign-affiliate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${managerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ affiliate_id: affiliateId, team_id: teamId })
  });
  return response.json();
};
```

### 2. Team Performance Tracking
```javascript
// Get team performance
const getTeamPerformance = async (teamId) => {
  const response = await fetch(`/api/manager/teams/${teamId}/performance`, {
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  return response.json();
};

// Get team affiliates
const getTeamAffiliates = async (teamId) => {
  const response = await fetch(`/api/manager/teams/${teamId}/affiliates`, {
    headers: { 'Authorization': `Bearer ${managerToken}` }
  });
  return response.json();
};
```

## 🎯 Affiliate Portal Features

### Dashboard Components:
- **Statistics**: Total referrals, commission earned, pending amounts
- **Recent Activity**: Latest referrals, commissions, payouts
- **Monthly Performance**: New referrals, conversions, earnings
- **Quick Actions**: Request payout, view materials

### Commission Tracking:
- Automatic calculation on deposits, bets, losses
- Multiple commission types (deposit, bet, loss, NGR)
- Status tracking (pending, approved, paid, cancelled)
- Filtering and export capabilities

### Marketing Materials:
- Banners in various sizes
- Text links with referral codes
- Email templates
- Landing pages

## 💰 Commission System

### Default Configuration:
- **Commission Rate**: 5% (configurable per affiliate)
- **Minimum Payout**: $50 (configurable)
- **Commission Types**: Deposit, bet, loss, net gaming revenue

### Automatic Triggers:
- User registration via referral link
- First deposit by referred user
- Ongoing betting activity
- Monthly NGR calculations

## 🏢 Team Management System

### Team Structure:
- **Affiliates Manager**: Manages multiple teams
- **Teams**: Group of affiliates with shared goals
- **Affiliates**: Individual marketing partners
- **Team Goals**: Performance targets and commission rates

### Team Features:
- **Team Creation**: Managers can create and manage teams
- **Affiliate Assignment**: Assign affiliates to specific teams
- **Performance Tracking**: Monitor team and individual performance
- **Commission Management**: Set team-specific commission rates
- **Goal Setting**: Define team performance targets

### Manager Permissions:
- Create and manage teams
- Assign affiliates to teams
- View team performance analytics
- Set team commission rates
- Manage team goals and targets

## 🧪 Testing

### Database Testing:
```sql
-- Test affiliate profile
INSERT INTO affiliate_profiles (user_id, referral_code, display_name) 
VALUES (1, 'TEST123', 'Test Affiliate');

-- Test team creation
INSERT INTO affiliate_teams (name, manager_id, team_commission_rate) 
VALUES ('Test Team', 1, 5.5);

-- Test commission calculation
SELECT calculate_affiliate_commission(1, 2, 1, 100.00, 'deposit');
```

### API Testing:
```bash
# Test affiliate dashboard
curl -X GET http://localhost:3000/api/affiliate/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test manager dashboard
curl -X GET http://localhost:3000/api/manager/dashboard \
  -H "Authorization: Bearer MANAGER_TOKEN"

# Test team creation
curl -X POST http://localhost:3000/api/manager/teams \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Team", "description": "Test team description"}'

# Test role creation
curl -X POST http://localhost:3000/api/admin/roles \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Role", "description": "Test description"}'
```

## 🔒 Security Features

- JWT authentication for all endpoints
- Role-based access control (Admin, Affiliates Manager, Affiliate)
- Input validation with Zod schemas
- Rate limiting protection
- Audit logging for compliance

## 📊 Key Metrics

Track these important metrics:
- Total affiliates and active affiliates
- Team performance and goal achievement
- Referral conversion rates
- Commission earned vs paid
- Affiliate performance rankings
- ROI on affiliate program

## 🚀 Deployment Checklist

- [ ] Run database migration
- [ ] Test all API endpoints
- [ ] Verify role-based access
- [ ] Configure commission rates
- [ ] Set up marketing materials
- [ ] Test affiliate tracking
- [ ] Verify payout system
- [ ] Test admin management
- [ ] Test team management
- [ ] Set up monitoring

## 📞 Support

For issues or customization:
1. Check API documentation
2. Review error logs
3. Verify database connections
4. Test with sample data
5. Contact development team

---

The affiliate system is now ready for production use with comprehensive tracking, analytics, management capabilities, and **team management by Affiliates Managers**. 