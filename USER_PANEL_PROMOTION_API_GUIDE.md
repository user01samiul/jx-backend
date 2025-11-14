# User Panel Promotion API Guide

## Overview
This guide provides all the API endpoints and implementation details for the user panel promotion system in JackpotX.

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## API Endpoints

### 1. Get Available Promotions
**GET** `/api/promotions`

Returns all available promotions for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": [
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
      "is_claimed": false,
      "can_claim": true,
      "start_date": "2025-01-01T00:00:00.000Z",
      "end_date": "2025-12-31T23:59:59.000Z"
    }
  ]
}
```

**Frontend Implementation:**
```javascript
const getPromotions = async () => {
  try {
    const response = await fetch('/api/promotions', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }
};
```

---

### 2. Claim Promotion
**POST** `/api/promotions/claim`

Claim a specific promotion/bonus.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "promotion_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promotion claimed successfully",
  "data": {
    "promotion_id": 1,
    "bonus_amount": 100.00,
    "free_spins_count": 50,
    "wagering_requirement": 35.00
  }
}
```

**Frontend Implementation:**
```javascript
const claimPromotion = async (promotionId) => {
  try {
    const response = await fetch('/api/promotions/claim', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ promotion_id: promotionId })
    });
    const data = await response.json();
    
    if (data.success) {
      showNotification('Promotion claimed successfully!', 'success');
      refreshPromotions();
    } else {
      showNotification(data.message, 'error');
    }
    
    return data;
  } catch (error) {
    console.error('Error claiming promotion:', error);
    showNotification('Failed to claim promotion', 'error');
  }
};
```

---

### 3. Get User's Claimed Promotions
**GET** `/api/promotions/my`

Returns all promotions claimed by the user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "status": "active",
      "claimed_at": "2025-01-05T10:00:00.000Z",
      "bonus_amount": 100.00,
      "wagering_completed": 500.00,
      "promotion_id": 1,
      "name": "Welcome Bonus",
      "wagering_requirement": 1000.00
    }
  ]
}
```

---

### 4. Daily Spin
**GET** `/api/promotions/daily-spin` - Check availability
**POST** `/api/promotions/daily-spin` - Perform spin

**Response:**
```json
{
  "success": true,
  "data": {
    "spin_result": {
      "type": "bonus",
      "amount": 5.00,
      "description": "Medium bonus"
    },
    "next_spin_available": "2025-01-06T10:00:00.000Z"
  }
}
```

---

### 5. Get Wagering Progress
**GET** `/api/promotions/wagering-progress`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "promotion_id": 1,
      "wagering_requirement": 1000.00,
      "wagering_completed": 500.00,
      "progress_percentage": 50.00,
      "is_completed": false
    }
  ]
}
```

---

### 6. Get Bonus Balance Summary
**GET** `/api/promotions/bonus-summary`

**Response:**
```json
{
  "success": true,
  "data": {
    "bonus_balance": 150.00,
    "active_promotions": 2,
    "total_bonus_claimed": 300.00,
    "wagering_progress": 50.00
  }
}
```

---

### 7. Transfer Bonus to Main Balance
**POST** `/api/promotions/transfer-bonus`

**Request Body:**
```json
{
  "amount": 50.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bonus balance transferred successfully",
  "data": { "amount": 50.00 }
}
```

---

### 8. Check Promotion Eligibility
**GET** `/api/promotions/{promotion_id}/eligibility`

**Response:**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "reason": "Minimum deposit of $20 required",
    "required_deposit": 20.00,
    "current_deposit": 10.00
  }
}
```

---

## Data Structures

### Promotion Object
```javascript
{
  id: 1,
  name: "Welcome Bonus",
  description: "Get 100% bonus on your first deposit",
  type: "welcome_bonus", // welcome_bonus, deposit_bonus, free_spins, cashback, reload_bonus, tournament
  bonus_percentage: 100.00,
  max_bonus_amount: 500.00,
  min_deposit_amount: 20.00,
  wagering_requirement: 35.00,
  free_spins_count: 50,
  is_claimed: false,
  can_claim: true
}
```

### Wagering Progress Object
```javascript
{
  promotion_id: 1,
  wagering_requirement: 1000.00,
  wagering_completed: 500.00,
  progress_percentage: 50.00,
  is_completed: false
}
```

### Daily Spin Result Object
```javascript
{
  type: "bonus", // bonus, free_spins, nothing
  amount: 5.00,
  description: "Medium bonus"
}
```

---

## Error Handling

### Common Error Responses

**400 - Bad Request**
```json
{
  "success": false,
  "message": "Promotion already claimed"
}
```

**400 - Insufficient Balance**
```json
{
  "success": false,
  "message": "Insufficient bonus balance"
}
```

**400 - Daily Spin Used**
```json
{
  "success": false,
  "message": "You have already used your daily spin today"
}
```

**404 - Not Found**
```json
{
  "success": false,
  "message": "Promotion not found or not available"
}
```

---

## Frontend Implementation Examples

### Complete Promotion Component
```javascript
import React, { useState, useEffect } from 'react';

const PromotionComponent = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const data = await getPromotions();
      setPromotions(data);
    } catch (error) {
      console.error('Failed to load promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPromotion = async (promotionId) => {
    try {
      const result = await claimPromotion(promotionId);
      if (result.success) {
        loadPromotions(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to claim promotion:', error);
    }
  };

  if (loading) return <div>Loading promotions...</div>;

  return (
    <div className="promotions-container">
      {promotions.map(promotion => (
        <div key={promotion.id} className="promotion-card">
          <h3>{promotion.name}</h3>
          <p>{promotion.description}</p>
          <div className="bonus-info">
            <span>{promotion.bonus_percentage}% Bonus</span>
            <span>Max: ${promotion.max_bonus_amount}</span>
          </div>
          <button 
            onClick={() => handleClaimPromotion(promotion.id)}
            disabled={!promotion.can_claim}
            className={promotion.is_claimed ? 'claimed' : 'claim'}
          >
            {promotion.is_claimed ? 'Claimed' : 'Claim Now'}
          </button>
        </div>
      ))}
    </div>
  );
};
```

### Wagering Progress Component
```javascript
const WageringProgress = () => {
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    loadWageringProgress();
  }, []);

  const loadWageringProgress = async () => {
    const data = await getWageringProgress();
    setProgress(data);
  };

  return (
    <div className="wagering-progress">
      {progress.map(item => (
        <div key={item.promotion_id} className="progress-item">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${item.progress_percentage}%` }}
            />
          </div>
          <span>{item.progress_percentage}% Complete</span>
          <span>${item.wagering_completed} / ${item.wagering_requirement}</span>
        </div>
      ))}
    </div>
  );
};
```

### Daily Spin Component
```javascript
const DailySpin = () => {
  const [canSpin, setCanSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    checkSpinAvailability();
  }, []);

  const checkSpinAvailability = async () => {
    const data = await checkDailySpin();
    setCanSpin(data.can_spin);
  };

  const handleSpin = async () => {
    setSpinning(true);
    try {
      const result = await performDailySpin();
      if (result.success) {
        showRewardModal(result.data.spin_result);
        setCanSpin(false);
      }
    } catch (error) {
      console.error('Spin failed:', error);
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className="daily-spin">
      <button 
        onClick={handleSpin} 
        disabled={!canSpin || spinning}
        className="spin-button"
      >
        {spinning ? 'Spinning...' : 'Spin Daily Wheel'}
      </button>
    </div>
  );
};
```

---

## Best Practices

1. **Error Handling**: Always check `response.success` before using data
2. **Loading States**: Show loading indicators during API calls
3. **Real-time Updates**: Use polling or WebSocket for wagering progress updates
4. **Validation**: Validate amounts before transfer requests
5. **Caching**: Cache promotion data to reduce API calls
6. **User Feedback**: Show success/error messages for all user actions
7. **Retry Logic**: Implement retry for failed API calls
8. **Rate Limiting**: Respect API rate limits and show appropriate messages

---

## Testing

Use the provided test file `test_promotion_api.js` to test all endpoints:

```bash
node test_promotion_api.js
```

This will test all promotion endpoints and provide detailed feedback on their functionality.
