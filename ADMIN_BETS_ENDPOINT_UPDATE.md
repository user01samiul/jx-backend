# Admin Bets Endpoint Update

## ✅ **Updated: `/api/admin/bets` Endpoint**

The admin bets endpoint has been updated to include `transaction_id` and `access_token` for cancellation purposes.

## 🚨 **CRITICAL FIX: Duplicate Rows Issue**

**Issue Found**: The endpoint was returning duplicate rows for each bet because users had multiple tokens in the database.

**Solution**: Updated the query to use `LEFT JOIN LATERAL` to get only the **most recent valid token** per user.

## 📊 **Updated Response Format**

### Before (Missing transaction_id and access_token):
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1035,
      "user_id": 48,
      "username": "player50",
      "game_id": 13,
      "game_name": "Provider Game 13",
      "category": "slots",
      "bet_amount": 0.20,
      "win_amount": 0.00,
      "outcome": "cancelled",
      "placed_at": "2025-08-07T23:56:20.457Z",
      "result_at": "2025-08-07T23:56:21.004Z"
    }
  ]
}
```

### After (Includes transaction_id and access_token, no duplicates):
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1046,
      "user_id": 48,
      "username": "player50",
      "game_id": 18,
      "game_name": "Provider Game 18",
      "category": "slots",
      "bet_amount": "0.20",
      "win_amount": "0.08",
      "outcome": "win",
      "placed_at": "2025-08-08T04:38:03.530Z",
      "result_at": "2025-08-08T04:38:04.080Z",
      "transaction_id": "2239582",
      "access_token": "efee5d23266cb51e03aefb2364c36f0e"
    }
  ]
}
```

## 🎯 **Key Changes**

### 1. **Added Fields**
- **`transaction_id`**: The external reference from the transactions table (for cancellation)
- **`access_token`**: The user's access token for provider callback authentication
- **Type**: `string`
- **Description**: Transaction ID and access token for cancellation purposes

### 2. **Fixed Query (No More Duplicates)**
```sql
SELECT 
  b.id as bet_id, 
  b.user_id, 
  u.username, 
  b.game_id, 
  g.name as game_name, 
  g.category, 
  b.bet_amount, 
  b.win_amount, 
  b.outcome, 
  b.placed_at, 
  b.result_at,
  t.external_reference as transaction_id,  -- External reference for cancellation
  tk.access_token                          -- Most recent valid token
FROM bets b
JOIN users u ON b.user_id = u.id
JOIN games g ON b.game_id = g.id
JOIN transactions t ON b.transaction_id = t.id  -- Join to get external_reference
LEFT JOIN LATERAL (
  SELECT access_token 
  FROM tokens 
  WHERE user_id = b.user_id AND expired_at > NOW() 
  ORDER BY created_at DESC 
  LIMIT 1
) tk ON true  -- Get only the most recent valid token per user
```

### 3. **Database Relationship Explanation**
- **`bets.transaction_id`**: Integer ID (e.g., 2318) - internal reference
- **`transactions.external_reference`**: String ID (e.g., "2239566") - external reference for cancellation
- **For cancellation**: We need the `external_reference`, not the internal ID
- **Token Selection**: Uses LATERAL join to get the most recent valid token per user

### 4. **Updated Swagger Documentation**
- Added `transaction_id` field to the response schema
- Added `access_token` field to the response schema
- Updated descriptions to mention cancellation purposes

## 🔄 **Admin Frontend Integration**

### Step 1: Get Bets with Transaction IDs and Access Tokens
```javascript
// Fetch bets for a user
const response = await fetch('/api/admin/bets?user_id=48&limit=10', {
  headers: {
    'Authorization': 'Bearer admin_token'
  }
});

const bets = response.data.data;
```

### Step 2: Display Transaction ID and Access Token in UI
```javascript
// In your admin panel table
bets.forEach(bet => {
  console.log(`Bet ${bet.bet_id}: Transaction ID = ${bet.transaction_id}`);
  console.log(`Bet ${bet.bet_id}: Access Token = ${bet.access_token}`);
  // Display both fields in your UI for cancellation
});
```

### Step 3: Use Transaction ID and Access Token for Cancellation
```javascript
// When user clicks cancel button
async function cancelBet(transactionId, accessToken, userId) {
  // First validate the transaction
  const validation = await validateTransaction(transactionId, userId);
  
  if (validation.data.can_cancel) {
    // Use the provider callback system with the access token
    const cancelRequest = {
      command: 'cancel',
      request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      hash: generateHash('cancel', timestamp),
      data: {
        transaction_id: transactionId,  // This is the external_reference
        token: accessToken,  // Use the access_token from the bets endpoint
        user_id: userId
      }
    };
    
    const response = await axios.post('/innova/cancel', cancelRequest, {
      headers: {
        'X-Authorization': generateAuthHeader('cancel')
      }
    });
    
    return response.data;
  } else {
    throw new Error('Transaction cannot be cancelled');
  }
}
```

## 📋 **Complete Workflow**

### 1. **List Bets with Access Tokens**
```bash
GET /api/admin/bets?user_id=48&limit=10
```

### 2. **Validate Transaction**
```bash
POST /api/admin/provider/validate-transaction
{
  "transaction_id": "2239566",
  "user_id": 48
}
```

### 3. **Cancel Transaction with Access Token**
```bash
POST /innova/cancel
{
  "command": "cancel",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "transaction_id": "2239566",  // External reference from transactions table
    "token": "cecb0fc413ae3f38ad0583965ba90a91",  // From bets endpoint
    "user_id": 48
  }
}
```

## 🎯 **Benefits**

1. **✅ Complete Information**: Admin frontend now has all necessary data
2. **✅ Proper Authentication**: Can use real access tokens for provider callbacks
3. **✅ No Token Lookup**: Access token is included in the same response
4. **✅ Simplified Workflow**: One API call provides everything needed
5. **✅ Error Prevention**: Reduces authentication and lookup errors

## 🔧 **Testing**

### Test the Updated Endpoint:
```bash
curl -X GET "http://localhost:3000/api/admin/bets?user_id=48&limit=3" \
  -H "Authorization: Bearer admin_token"
```

### Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1038,
      "user_id": 48,
      "username": "player50",
      "game_name": "Provider Game 18",
      "bet_amount": "0.20",
      "outcome": "win",
      "transaction_id": "2239566",
      "access_token": "cecb0fc413ae3f38ad0583965ba90a91"
    }
  ]
}
```

## 🚨 **Important Notes**

1. **Only Valid Bets**: Only bets with corresponding transaction records will be returned
2. **Active Tokens Only**: Only non-expired access tokens are included
3. **Transaction ID Required**: All cancellation operations need the transaction_id (external_reference)
4. **Provider Callback**: Use the provider callback system, not separate admin APIs
5. **Real Tokens**: Access tokens are real and valid for provider callbacks

## 📞 **Next Steps**

1. **Update Admin Frontend**: Modify your admin panel to use the new fields
2. **Implement Provider Callbacks**: Use the access token for proper cancellation
3. **Test Thoroughly**: Test with real transactions and access tokens
4. **Monitor Results**: Track cancellation success rates and errors
5. **Document Process**: Update admin panel documentation 