# Admin Panel Promotion API Guide

## Overview
This guide provides the API endpoints and implementation details for the admin panel promotion management system in JackpotX.

**⚠️ IMPORTANT NOTE**: Currently, there are **NO admin-specific promotion endpoints** implemented in the backend. This guide provides the recommended endpoints that need to be implemented for full admin functionality.

## Authentication
All admin endpoints require a valid JWT token with admin privileges:
```
Authorization: Bearer <admin_jwt_token>
```

---

## Recommended Admin API Endpoints

### 1. Create Promotion
**POST** `/api/admin/promotions`

Create a new promotion.

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Welcome Bonus",
  "description": "Get 100% bonus on your first deposit",
  "type": "welcome_bonus",
  "bonus_percentage": 100.00,
  "max_bonus_amount": 500.00,
  "min_deposit_amount": 20.00,
  "wagering_requirement": 35.00,
  "free_spins_count": 50,
  "start_date": "2025-01-01T00:00:00.000Z",
  "end_date": "2025-12-31T23:59:59.000Z",
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promotion created successfully",
  "data": {
    "id": 1,
    "name": "Welcome Bonus",
    "created_at": "2025-01-05T10:00:00.000Z"
  }
}
```

**Frontend Implementation:**
```javascript
const createPromotion = async (promotionData) => {
  try {
    const response = await fetch('/api/admin/promotions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promotionData)
    });
    const data = await response.json();
    
    if (data.success) {
      showNotification('Promotion created successfully!', 'success');
      refreshPromotionsList();
    } else {
      showNotification(data.message, 'error');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating promotion:', error);
    showNotification('Failed to create promotion', 'error');
  }
};
```

---

### 2. Get All Promotions (Admin)
**GET** `/api/admin/promotions`

Get all promotions with detailed statistics.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
```
?page=1&limit=20&type=welcome_bonus&is_active=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "promotions": [
      {
        "id": 1,
        "name": "Welcome Bonus",
        "description": "Get 100% bonus on your first deposit",
        "type": "welcome_bonus",
        "bonus_percentage": 100.00,
        "max_bonus_amount": 500.00,
        "min_deposit_amount": 20.00,
        "wagering_requirement": 35.00,
        "free_spins_count": 50,
        "start_date": "2025-01-01T00:00:00.000Z",
        "end_date": "2025-12-31T23:59:59.000Z",
        "is_active": true,
        "created_at": "2025-01-05T10:00:00.000Z",
        "stats": {
          "total_claims": 150,
          "total_bonus_given": 25000.00,
          "completion_rate": 75.5,
          "active_users": 45
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

**Frontend Implementation:**
```javascript
const getAllPromotions = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`/api/admin/promotions?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    return data.success ? data.data : { promotions: [], pagination: {} };
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return { promotions: [], pagination: {} };
  }
};
```

---

### 3. Update Promotion
**PUT** `/api/admin/promotions/{id}`

Update an existing promotion.

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Welcome Bonus",
  "description": "Updated description",
  "bonus_percentage": 150.00,
  "max_bonus_amount": 750.00,
  "is_active": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promotion updated successfully",
  "data": {
    "id": 1,
    "updated_at": "2025-01-05T11:00:00.000Z"
  }
}
```

**Frontend Implementation:**
```javascript
const updatePromotion = async (id, promotionData) => {
  try {
    const response = await fetch(`/api/admin/promotions/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promotionData)
    });
    const data = await response.json();
    
    if (data.success) {
      showNotification('Promotion updated successfully!', 'success');
      refreshPromotionsList();
    } else {
      showNotification(data.message, 'error');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating promotion:', error);
    showNotification('Failed to update promotion', 'error');
  }
};
```

---

### 4. Delete Promotion
**DELETE** `/api/admin/promotions/{id}`

Delete a promotion (soft delete).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Promotion deleted successfully"
}
```

**Frontend Implementation:**
```javascript
const deletePromotion = async (id) => {
  try {
    const response = await fetch(`/api/admin/promotions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    
    if (data.success) {
      showNotification('Promotion deleted successfully!', 'success');
      refreshPromotionsList();
    } else {
      showNotification(data.message, 'error');
    }
    
    return data;
  } catch (error) {
    console.error('Error deleting promotion:', error);
    showNotification('Failed to delete promotion', 'error');
  }
};
```

---

### 5. Toggle Promotion Status
**PATCH** `/api/admin/promotions/{id}/toggle`

Activate or deactivate a promotion.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Promotion activated successfully",
  "data": {
    "id": 1,
    "is_active": true
  }
}
```

**Frontend Implementation:**
```javascript
const togglePromotion = async (id) => {
  try {
    const response = await fetch(`/api/admin/promotions/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    
    if (data.success) {
      const status = data.data.is_active ? 'activated' : 'deactivated';
      showNotification(`Promotion ${status} successfully!`, 'success');
      refreshPromotionsList();
    } else {
      showNotification(data.message, 'error');
    }
    
    return data;
  } catch (error) {
    console.error('Error toggling promotion:', error);
    showNotification('Failed to toggle promotion', 'error');
  }
};
```

---

### 6. Get Promotion Statistics
**GET** `/api/admin/promotions/{id}/stats`

Get detailed statistics for a specific promotion.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "promotion_id": 1,
    "total_claims": 150,
    "total_bonus_given": 25000.00,
    "total_wagering_completed": 150000.00,
    "completion_rate": 75.5,
    "active_users": 45,
    "completed_users": 113,
    "average_completion_time": 7.5,
    "daily_claims": [
      { "date": "2025-01-01", "claims": 5, "bonus_given": 500.00 },
      { "date": "2025-01-02", "claims": 8, "bonus_given": 800.00 }
    ],
    "user_demographics": {
      "new_users": 80,
      "existing_users": 70
    }
  }
}
```

**Frontend Implementation:**
```javascript
const getPromotionStats = async (id) => {
  try {
    const response = await fetch(`/api/admin/promotions/${id}/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching promotion stats:', error);
    return null;
  }
};
```

---

### 7. Get All Promotion Statistics
**GET** `/api/admin/promotions/stats/overview`

Get overview statistics for all promotions.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_promotions": 15,
    "active_promotions": 8,
    "total_claims": 1250,
    "total_bonus_given": 150000.00,
    "total_wagering_completed": 750000.00,
    "average_completion_rate": 72.3,
    "top_performing_promotions": [
      {
        "id": 1,
        "name": "Welcome Bonus",
        "claims": 150,
        "completion_rate": 75.5
      }
    ],
    "monthly_trends": [
      {
        "month": "2025-01",
        "claims": 150,
        "bonus_given": 25000.00
      }
    ]
  }
}
```

---

### 8. Bulk Operations
**POST** `/api/admin/promotions/bulk`

Perform bulk operations on promotions.

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "activate", // activate, deactivate, delete
  "promotion_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk operation completed successfully",
  "data": {
    "processed": 3,
    "successful": 3,
    "failed": 0
  }
}
```

---

### 9. Get User Promotions (Admin)
**GET** `/api/admin/promotions/users/{user_id}`

Get all promotions for a specific user (admin view).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "username": "testuser",
    "promotions": [
      {
        "id": 1,
        "promotion_id": 1,
        "status": "active",
        "claimed_at": "2025-01-05T10:00:00.000Z",
        "bonus_amount": 100.00,
        "wagering_completed": 500.00,
        "wagering_requirement": 1000.00,
        "promotion_name": "Welcome Bonus"
      }
    ]
  }
}
```

---

### 10. Manual Bonus Adjustment
**POST** `/api/admin/promotions/adjust-bonus`

Manually adjust a user's bonus balance.

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": 123,
  "amount": 50.00,
  "reason": "Manual adjustment for customer service",
  "type": "credit" // credit, debit
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bonus adjusted successfully",
  "data": {
    "user_id": 123,
    "amount": 50.00,
    "new_balance": 200.00
  }
}
```

---

## Data Structures

### Admin Promotion Object
```javascript
{
  id: 1,
  name: "Welcome Bonus",
  description: "Get 100% bonus on your first deposit",
  type: "welcome_bonus",
  bonus_percentage: 100.00,
  max_bonus_amount: 500.00,
  min_deposit_amount: 20.00,
  wagering_requirement: 35.00,
  free_spins_count: 50,
  start_date: "2025-01-01T00:00:00.000Z",
  end_date: "2025-12-31T23:59:59.000Z",
  is_active: true,
  created_at: "2025-01-05T10:00:00.000Z",
  updated_at: "2025-01-05T10:00:00.000Z",
  stats: {
    total_claims: 150,
    total_bonus_given: 25000.00,
    completion_rate: 75.5,
    active_users: 45
  }
}
```

### Promotion Statistics Object
```javascript
{
  promotion_id: 1,
  total_claims: 150,
  total_bonus_given: 25000.00,
  total_wagering_completed: 150000.00,
  completion_rate: 75.5,
  active_users: 45,
  completed_users: 113,
  average_completion_time: 7.5,
  daily_claims: [
    { date: "2025-01-01", claims: 5, bonus_given: 500.00 }
  ]
}
```

---

## Error Handling

### Common Error Responses

**400 - Bad Request**
```json
{
  "success": false,
  "message": "Invalid promotion data"
}
```

**401 - Unauthorized**
```json
{
  "success": false,
  "message": "Admin access required"
}
```

**404 - Not Found**
```json
{
  "success": false,
  "message": "Promotion not found"
}
```

**409 - Conflict**
```json
{
  "success": false,
  "message": "Promotion with this name already exists"
}
```

---

## Frontend Implementation Examples

### Admin Promotion Management Component
```javascript
import React, { useState, useEffect } from 'react';

const AdminPromotionManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromotion, setSelectedPromotion] = useState(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const data = await getAllPromotions();
      setPromotions(data.promotions);
    } catch (error) {
      console.error('Failed to load promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = async (promotionData) => {
    try {
      const result = await createPromotion(promotionData);
      if (result.success) {
        loadPromotions();
      }
    } catch (error) {
      console.error('Failed to create promotion:', error);
    }
  };

  const handleTogglePromotion = async (id) => {
    try {
      const result = await togglePromotion(id);
      if (result.success) {
        loadPromotions();
      }
    } catch (error) {
      console.error('Failed to toggle promotion:', error);
    }
  };

  if (loading) return <div>Loading promotions...</div>;

  return (
    <div className="admin-promotions">
      <div className="promotions-header">
        <h2>Promotion Management</h2>
        <button onClick={() => setSelectedPromotion({})}>Create New</button>
      </div>
      
      <div className="promotions-list">
        {promotions.map(promotion => (
          <div key={promotion.id} className="promotion-item">
            <div className="promotion-info">
              <h3>{promotion.name}</h3>
              <p>{promotion.description}</p>
              <span className={`status ${promotion.is_active ? 'active' : 'inactive'}`}>
                {promotion.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="promotion-stats">
              <span>Claims: {promotion.stats.total_claims}</span>
              <span>Completion: {promotion.stats.completion_rate}%</span>
            </div>
            <div className="promotion-actions">
              <button onClick={() => setSelectedPromotion(promotion)}>Edit</button>
              <button onClick={() => handleTogglePromotion(promotion.id)}>
                {promotion.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => viewStats(promotion.id)}>Stats</button>
            </div>
          </div>
        ))}
      </div>
      
      {selectedPromotion && (
        <PromotionForm 
          promotion={selectedPromotion}
          onSubmit={handleCreatePromotion}
          onClose={() => setSelectedPromotion(null)}
        />
      )}
    </div>
  );
};
```

### Promotion Statistics Component
```javascript
const PromotionStats = ({ promotionId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [promotionId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getPromotionStats(promotionId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading statistics...</div>;
  if (!stats) return <div>No statistics available</div>;

  return (
    <div className="promotion-stats">
      <h3>Promotion Statistics</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Total Claims</span>
          <span className="stat-value">{stats.total_claims}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Bonus Given</span>
          <span className="stat-value">${stats.total_bonus_given}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Completion Rate</span>
          <span className="stat-value">{stats.completion_rate}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active Users</span>
          <span className="stat-value">{stats.active_users}</span>
        </div>
      </div>
      
      <div className="daily-chart">
        <h4>Daily Claims</h4>
        {/* Chart component here */}
      </div>
    </div>
  );
};
```

---

## Best Practices

1. **Authorization**: Always verify admin privileges before allowing access
2. **Validation**: Validate all input data on both frontend and backend
3. **Audit Trail**: Log all admin actions for security and compliance
4. **Confirmation**: Require confirmation for destructive actions
5. **Real-time Updates**: Use WebSocket for real-time statistics updates
6. **Export Functionality**: Provide CSV/Excel export for reports
7. **Search and Filter**: Implement comprehensive search and filtering
8. **Pagination**: Use pagination for large datasets
9. **Error Handling**: Provide detailed error messages for debugging
10. **Backup**: Always backup data before bulk operations

---

## Implementation Priority

### Phase 1 (High Priority)
1. Create Promotion
2. Get All Promotions
3. Update Promotion
4. Toggle Promotion Status

### Phase 2 (Medium Priority)
1. Get Promotion Statistics
2. Delete Promotion
3. Bulk Operations
4. Get User Promotions

### Phase 3 (Low Priority)
1. Manual Bonus Adjustment
2. Advanced Analytics
3. Export Functionality
4. Real-time Dashboard

---

## Security Considerations

1. **Role-based Access**: Ensure only admin users can access these endpoints
2. **Input Validation**: Validate all input data to prevent injection attacks
3. **Rate Limiting**: Implement rate limiting for admin endpoints
4. **Audit Logging**: Log all admin actions for security monitoring
5. **Data Encryption**: Encrypt sensitive promotion data
6. **Session Management**: Implement proper session management for admin users
7. **CSRF Protection**: Implement CSRF protection for all admin forms
8. **API Key Management**: Use secure API key management for admin access

---

## Testing

Create comprehensive tests for all admin endpoints:

```javascript
// Example test structure
describe('Admin Promotion API', () => {
  test('should create promotion', async () => {
    // Test implementation
  });
  
  test('should update promotion', async () => {
    // Test implementation
  });
  
  test('should toggle promotion status', async () => {
    // Test implementation
  });
  
  test('should get promotion statistics', async () => {
    // Test implementation
  });
});
```

This guide provides a complete framework for implementing admin promotion management functionality in your JackpotX system.
