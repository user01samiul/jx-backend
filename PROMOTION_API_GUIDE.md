# Promotion & Bonus API Guide

This guide covers all the new promotion and bonus features implemented in the JackpotX backend API.

## Overview

The promotion system includes:
- **Bonus claiming** for various promotion types
- **Daily spin** functionality with rewards
- **Wagering requirement** tracking
- **Bonus balance** management
- **Promotion eligibility** checking

## API Endpoints

### 1. Get Available Promotions
**GET** `/api/promotions`

Returns all available promotions for the authenticated user.

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
      "can_claim": true
    }
  ]
}
```

### 2. Claim Promotion
**POST** `/api/promotions/claim`

Claim a specific promotion/bonus.

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

### 4. Check Daily Spin Availability
**GET** `/api/promotions/daily-spin`

Check if daily spin is available for the user.

**Response:**
```json
{
  "success": true,
  "can_spin": true,
  "message": "Daily spin available"
}
```

### 5. Perform Daily Spin
**POST** `/api/promotions/daily-spin`

Perform the daily spin and get rewards.

**Response:**
```json
{
  "success": true,
  "message": "Daily spin completed successfully",
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

### 6. Get Wagering Progress
**GET** `/api/promotions/wagering-progress`

Get wagering progress for user's active promotions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "promotion_id": 1,
      "wagering_requirement": 1000.00,
      "wagering_completed": 500.00,
      "remaining_wagering": 500.00,
      "progress_percentage": 50.00,
      "is_completed": false
    }
  ]
}
```

### 7. Get Bonus Balance Summary
**GET** `/api/promotions/bonus-summary`

Get comprehensive bonus balance information.

**Response:**
```json
{
  "success": true,
  "data": {
    "bonus_balance": 150.00,
    "active_promotions": 2,
    "total_bonus_claimed": 300.00,
    "total_wagering_completed": 500.00,
    "total_wagering_required": 1000.00,
    "wagering_progress": 50.00
  }
}
```

### 8. Transfer Bonus to Main Balance
**POST** `/api/promotions/transfer-bonus`

Transfer bonus balance to main balance (after wagering completion).

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
  "data": {
    "amount": 50.00
  }
}
```

### 9. Check Promotion Eligibility
**GET** `/api/promotions/{promotion_id}/eligibility`

Check if user is eligible for a specific promotion.

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

## Promotion Types

### 1. Welcome Bonus
- **Type**: `welcome_bonus`
- **Eligibility**: New users only, one-time claim
- **Requirements**: Minimum deposit amount
- **Calculation**: Percentage of deposit up to max amount

### 2. Deposit Bonus
- **Type**: `deposit_bonus`
- **Eligibility**: All users with sufficient deposits
- **Requirements**: Minimum deposit amount
- **Calculation**: Percentage of deposit up to max amount

### 3. Reload Bonus
- **Type**: `reload_bonus`
- **Eligibility**: Existing users
- **Requirements**: Minimum deposit amount
- **Calculation**: Percentage of deposit up to max amount

### 4. Free Spins
- **Type**: `free_spins`
- **Eligibility**: All users with sufficient deposits
- **Requirements**: Minimum deposit amount
- **Reward**: Fixed number of free spins

### 5. Cashback
- **Type**: `cashback`
- **Eligibility**: Users with sufficient wagering
- **Requirements**: Minimum wagering amount
- **Calculation**: Percentage of losses

## Daily Spin System

### Spin Rewards
The daily spin system offers various rewards with different probabilities:

- **Small Bonus** (40%): $1 bonus
- **Medium Bonus** (25%): $5 bonus
- **Large Bonus** (10%): $10 bonus
- **10 Free Spins** (15%): 10 free spins
- **25 Free Spins** (5%): 25 free spins
- **Nothing** (5%): Better luck next time

### Spin Rules
- One spin per day per user
- Resets at midnight UTC
- Rewards are automatically added to bonus balance
- Free spins are converted to bonus amount ($0.10 per spin)

## Wagering Requirements

### How It Works
1. When a user claims a promotion, wagering requirements are set
2. Every bet placed contributes to wagering progress
3. Progress is tracked in real-time
4. Once requirements are met, promotion status changes to "completed"

### Wagering Calculation
- Only bets count towards wagering (wins don't count)
- All game categories contribute to wagering
- Progress is tracked per promotion
- Multiple active promotions can have different requirements

## Bonus Balance Management

### Balance Types
- **Main Balance**: Regular account balance
- **Bonus Balance**: Promotional funds with wagering requirements
- **Locked Balance**: Funds tied to pending bets

### Transfer Rules
- Bonus balance can only be transferred after wagering completion
- Transfers are instant and irreversible
- Minimum transfer amount: $1
- Maximum transfer: Available bonus balance

## Error Handling

### Common Error Responses

**400 - Bad Request**
```json
{
  "success": false,
  "message": "Promotion already claimed"
}
```

**404 - Not Found**
```json
{
  "success": false,
  "message": "Promotion not found or not available"
}
```

**400 - Insufficient Balance**
```json
{
  "success": false,
  "message": "Insufficient bonus balance"
}
```

## Integration Examples

### Frontend Integration

```javascript
// Get available promotions
const promotions = await fetch('/api/promotions', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Claim a promotion
const claim = await fetch('/api/promotions/claim', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ promotion_id: 1 })
});

// Perform daily spin
const spin = await fetch('/api/promotions/daily-spin', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Wagering Progress Display

```javascript
// Get wagering progress
const progress = await fetch('/api/promotions/wagering-progress', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Display progress bar
const progressData = await progress.json();
progressData.data.forEach(promo => {
  console.log(`Promotion ${promo.promotion_id}: ${promo.progress_percentage}% complete`);
});
```

## Database Schema

### Key Tables

**promotions**
- Stores promotion definitions
- Includes wagering requirements, bonus percentages, etc.

**user_promotions**
- Tracks user's claimed promotions
- Stores wagering progress and status

**user_balances**
- Contains bonus_balance field
- Tracks main and bonus balances separately

**transactions**
- Records all bonus transactions
- Type: 'bonus' for promotional funds

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token
2. **Eligibility Validation**: Server-side validation of all promotion claims
3. **Wagering Tracking**: Real-time tracking prevents manipulation
4. **Balance Protection**: Bonus balance transfers are atomic operations
5. **Rate Limiting**: Daily spin limited to once per day per user

## Testing

### Test Scenarios

1. **New User Welcome Bonus**
   - Register new user
   - Make minimum deposit
   - Claim welcome bonus
   - Verify bonus balance increase

2. **Wagering Progress**
   - Claim promotion with wagering requirement
   - Place multiple bets
   - Verify wagering progress updates
   - Complete wagering requirement

3. **Daily Spin**
   - Perform daily spin
   - Verify reward distribution
   - Attempt second spin (should fail)
   - Wait for reset and try again

4. **Bonus Transfer**
   - Complete wagering requirements
   - Transfer bonus to main balance
   - Verify balance updates

## Monitoring

### Key Metrics to Track

1. **Promotion Performance**
   - Claim rates per promotion type
   - Completion rates (wagering requirements)
   - Average bonus amounts claimed

2. **User Engagement**
   - Daily spin participation
   - Wagering activity after bonus claims
   - Bonus balance utilization

3. **System Health**
   - API response times
   - Error rates
   - Database performance

## Future Enhancements

1. **Tiered Promotions**: Different bonuses based on user level
2. **Time-limited Promotions**: Flash sales and limited-time offers
3. **Referral Bonuses**: Rewards for bringing new users
4. **Loyalty Program**: Points-based reward system
5. **Tournament Bonuses**: Special promotions for game tournaments 