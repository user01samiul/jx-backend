# Frontend Cancel Endpoint Implementation

## Overview

This document describes the implementation of a new cancel endpoint for the frontend user panel that allows users to cancel their game transactions (bets and wins) directly from the game interface.

## Problem Statement

The provider requested a cancel button in the frontend user panel's game play section that would allow users to cancel their transactions. Previously, only the provider callback cancel endpoint existed, but there was no user-facing cancel functionality.

## Solution Implementation

### 1. **API Endpoint**
- **URL**: `POST /api/games/cancel`
- **Authentication**: Bearer token required
- **Location**: `src/routes/api.ts`

### 2. **Database Schema**
- **Schema**: `CancelGameSchema` in `src/api/game/game.schema.ts`
- **Required Fields**: `transaction_id`
- **Optional Fields**: `game_id`, `reason`

### 3. **Service Layer**
- **Service**: `cancelGameService` in `src/services/game/game.service.ts`
- **Features**: Transaction validation, balance calculation, database updates

### 4. **Controller Layer**
- **Controller**: `cancelGame` in `src/api/game/game.controller.ts`
- **Features**: Request validation, error handling, response formatting

### 5. **Database Tracking**
- **Table**: `cancellation_tracking` (new table)
- **Purpose**: Audit trail and reporting
- **Migration**: `migration-add-cancellation-tracking.sql`

## API Documentation

### Endpoint Details

```http
POST /api/games/cancel
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

```json
{
  "transaction_id": "2223977",
  "game_id": 53,
  "reason": "User requested cancellation"
}
```

### Response

```json
{
  "success": true,
  "message": "Transaction cancelled successfully",
  "data": {
    "transaction_id": "2223977",
    "original_type": "bet",
    "original_amount": 0.15,
    "balance_adjustment": 0.15,
    "new_balance": 1499.34,
    "currency": "USD",
    "category": "slot",
    "adjustment_transaction_id": 12345
  }
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "success": false,
  "message": "Transaction not found or already cancelled"
}
```

#### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

#### 404 - Not Found
```json
{
  "success": false,
  "message": "Transaction not found"
}
```

## Business Logic

### Cancellation Rules

1. **BET Cancellation**
   - **Action**: Add funds back to balance
   - **Logic**: `balance_adjustment = +original_amount`
   - **Reason**: Bet was deducted, so add it back

2. **WIN Cancellation**
   - **Action**: Deduct funds from balance
   - **Logic**: `balance_adjustment = -original_amount`
   - **Reason**: Win was added, so deduct it back

3. **Validation Rules**
   - Only `bet` and `win` transactions can be cancelled
   - Transaction must exist and belong to the user
   - Transaction must not already be cancelled
   - User must be authenticated

### Balance Calculation

```typescript
// BET Cancellation
if (transaction.type === 'bet') {
  balanceAdjustment = transactionAmount; // Positive
  adjustmentDescription = `Cancelled bet refund: +$${transactionAmount.toFixed(2)}`;
}

// WIN Cancellation
if (transaction.type === 'win') {
  balanceAdjustment = -transactionAmount; // Negative
  adjustmentDescription = `Cancelled win reversal: -$${transactionAmount.toFixed(2)}`;
}
```

## Database Schema

### Cancellation Tracking Table

```sql
CREATE TABLE cancellation_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    original_transaction_id VARCHAR(255) NOT NULL,
    original_type VARCHAR(50) NOT NULL CHECK (original_type IN ('bet', 'win')),
    original_amount DECIMAL(15,2) NOT NULL,
    balance_adjustment DECIMAL(15,2) NOT NULL,
    reason TEXT,
    game_id INTEGER,
    category VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    adjustment_transaction_id INTEGER,
    cancelled_by VARCHAR(50) DEFAULT 'user',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Key Features

- **Audit Trail**: Complete tracking of all cancellations
- **Performance**: Indexed for fast queries
- **Data Integrity**: Foreign key constraints and checks
- **Reporting**: View for easy reporting (`cancellation_summary`)

## Implementation Files

### 1. Schema Definition
**File**: `src/api/game/game.schema.ts`
```typescript
export const CancelGameSchema = z.object({
  transaction_id: z.string().min(1, "Transaction ID is required"),
  game_id: z.number().positive("Game ID must be a positive number").optional(),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
});
```

### 2. Service Implementation
**File**: `src/services/game/game.service.ts`
- `cancelGameService()` function
- Transaction validation
- Balance calculation
- Database updates
- Activity logging

### 3. Controller Implementation
**File**: `src/api/game/game.controller.ts`
- `cancelGame()` function
- Request validation
- Error handling
- Response formatting

### 4. Route Definition
**File**: `src/routes/api.ts`
- Route: `POST /api/games/cancel`
- Middleware: Authentication, validation
- Swagger documentation

### 5. Database Migration
**File**: `migration-add-cancellation-tracking.sql`
- Table creation
- Indexes
- Constraints
- Views

## Testing

### Test Files

1. **`test-frontend-cancel.js`** - Frontend endpoint testing
2. **`test-bet-win-cancel.js`** - Provider callback testing

### Test Scenarios

1. **Valid Cancellations**
   - Cancel BET transaction
   - Cancel WIN transaction
   - Balance verification

2. **Invalid Scenarios**
   - Invalid transaction ID
   - Missing transaction ID
   - Already cancelled transaction
   - Unauthorized access

3. **Edge Cases**
   - Category balance updates
   - Main balance updates
   - Error handling

## Swagger Integration

The endpoint is fully documented in Swagger with:

- **Request/Response schemas**
- **Authentication requirements**
- **Error responses**
- **Examples**
- **Validation rules**

## Security Features

1. **Authentication Required**: Bearer token validation
2. **Authorization**: User can only cancel their own transactions
3. **Input Validation**: Schema-based validation
4. **SQL Injection Protection**: Parameterized queries
5. **Audit Logging**: Complete activity tracking

## Monitoring and Logging

### Log Levels

- **DEBUG**: Detailed transaction processing
- **INFO**: Successful cancellations
- **ERROR**: Failed cancellations

### Log Messages

```typescript
console.log(`[CANCEL_GAME] Starting cancellation for user ${userId}, transaction ${transactionId}`);
console.log(`[CANCEL_GAME] Found transaction: ${JSON.stringify(transaction)}`);
console.log(`[CANCEL_GAME] Category balance adjustment: $${currentCategoryBalance} + $${balanceAdjustment} = $${newCategoryBalance}`);
console.log(`[CANCEL_GAME] Successfully cancelled transaction ${transactionId} for user ${userId}`);
```

## Frontend Integration

### Usage Example

```javascript
// Cancel a bet transaction
const cancelTransaction = async (transactionId, gameId, reason) => {
  try {
    const response = await fetch('/api/games/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        game_id: gameId,
        reason: reason
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Transaction cancelled successfully');
      console.log('New balance:', result.data.new_balance);
    } else {
      console.error('Cancellation failed:', result.message);
    }
  } catch (error) {
    console.error('Error cancelling transaction:', error);
  }
};
```

### UI Integration

1. **Cancel Button**: Add to game interface
2. **Confirmation Dialog**: Ask user to confirm cancellation
3. **Reason Input**: Optional reason field
4. **Success/Error Messages**: User feedback
5. **Balance Update**: Real-time balance display

## Benefits

1. **User Control**: Users can cancel their own transactions
2. **Transparency**: Clear audit trail
3. **Security**: Proper authentication and validation
4. **Compliance**: Complete transaction tracking
5. **Maintainability**: Clean, modular code structure
6. **Documentation**: Comprehensive API documentation

## Future Enhancements

1. **Admin Cancellation**: Admin panel for transaction cancellation
2. **Bulk Cancellation**: Cancel multiple transactions
3. **Cancellation Limits**: Time-based cancellation restrictions
4. **Notification System**: Email/SMS notifications for cancellations
5. **Analytics Dashboard**: Cancellation statistics and reporting

## Conclusion

The frontend cancel endpoint provides a complete solution for user-initiated transaction cancellations with:

- ✅ **Proper OOP principles**
- ✅ **Comprehensive error handling**
- ✅ **Database tracking and audit trail**
- ✅ **Swagger documentation**
- ✅ **Security and validation**
- ✅ **Testing coverage**

The implementation follows best practices and provides a solid foundation for the frontend cancel functionality. 