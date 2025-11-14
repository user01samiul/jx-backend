# Admin Frontend Cancellation Fix

## 🚨 **Problem Identified**

Your admin frontend is getting "Invalid access token provided" because it's using the **WRONG ENDPOINT** and **WRONG FORMAT**.

## ❌ **What You're Doing (WRONG)**

```javascript
// ❌ WRONG - Using frontend endpoint with wrong format
POST /api/games/cancel
{
  "transactionId": "2239566",
  "token": "cecb0fc413ae3f38ad0583965ba90a91",
  "userId": 48
}
```

## ✅ **What You Should Do (CORRECT)**

```javascript
// ✅ CORRECT - Using provider callback endpoint with proper format
POST /innova/cancel
{
  "command": "cancel",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "transaction_id": "2239566",
    "token": "cecb0fc413ae3f38ad0583965ba90a91",
    "user_id": 48
  }
}
```

## 🔧 **Complete Fix for Admin Frontend**

### Step 1: Update Your Cancellation Function

```javascript
// ❌ OLD CODE (WRONG)
async function cancelBet(transactionId, token, userId) {
  const response = await fetch('/api/games/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin_token'
    },
    body: JSON.stringify({
      transactionId: transactionId,
      token: token,
      userId: userId
    })
  });
  return response.json();
}

// ✅ NEW CODE (CORRECT)
async function cancelBet(transactionId, accessToken, userId) {
  // Step 1: Validate the transaction first
  const validation = await fetch('/api/admin/provider/validate-transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin_token'
    },
    body: JSON.stringify({
      transaction_id: transactionId,
      user_id: userId
    })
  });
  
  const validationResult = await validation.json();
  
  if (!validationResult.data.can_cancel) {
    throw new Error('Transaction cannot be cancelled: ' + validationResult.data.transaction_status);
  }
  
  // Step 2: Cancel using provider callback
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const hash = generateHash('cancel', timestamp); // You need to implement this
  
  const response = await fetch('/innova/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': hash
    },
    body: JSON.stringify({
      command: 'cancel',
      request_timestamp: timestamp,
      hash: hash,
      data: {
        transaction_id: transactionId,
        token: accessToken,
        user_id: userId
      }
    })
  });
  
  return response.json();
}
```

### Step 2: Implement Hash Generation

```javascript
// Add this function to your admin frontend
function generateHash(command, timestamp) {
  const secretKey = 'your_secret_key'; // Get this from your backend configuration
  const data = command + timestamp + secretKey;
  
  // Use crypto-js or similar library
  return CryptoJS.SHA1(data).toString();
}
```

### Step 3: Update Your UI Code

```javascript
// When user clicks cancel button
async function handleCancelClick(bet) {
  try {
    console.log('Cancelling bet:', bet);
    
    const result = await cancelBet(
      bet.transaction_id,  // From the bets endpoint
      bet.access_token,    // From the bets endpoint
      bet.user_id          // From the bets endpoint
    );
    
    console.log('Cancellation result:', result);
    
    if (result.response && result.response.status === 'OK') {
      alert('Bet cancelled successfully!');
      // Refresh the bets list
      loadBets();
    } else {
      alert('Failed to cancel bet: ' + (result.response?.message || 'Unknown error'));
    }
    
  } catch (error) {
    console.error('Cancellation error:', error);
    alert('Error cancelling bet: ' + error.message);
  }
}
```

## 📋 **Complete Workflow**

### 1. **Get Bets with Access Tokens**
```javascript
const bets = await fetch('/api/admin/bets?user_id=48');
// Returns: { transaction_id: "2239566", access_token: "cecb0fc413ae3f38ad0583965ba90a91" }
```

### 2. **Validate Transaction**
```javascript
const validation = await fetch('/api/admin/provider/validate-transaction', {
  method: 'POST',
  body: JSON.stringify({
    transaction_id: "2239566",
    user_id: 48
  })
});
// Returns: { can_cancel: true, transaction_status: "completed" }
```

### 3. **Cancel with Provider Callback**
```javascript
const result = await fetch('/innova/cancel', {
  method: 'POST',
  headers: { 'X-Authorization': hash },
  body: JSON.stringify({
    command: 'cancel',
    request_timestamp: "2025-08-08 00:00:00",
    hash: hash,
    data: {
      transaction_id: "2239566",
      token: "cecb0fc413ae3f38ad0583965ba90a91",
      user_id: 48
    }
  })
});
// Returns: { response: { status: "OK", data: { transaction_status: "CANCELED" } } }
```

## 🎯 **Key Changes Required**

1. **❌ Stop using `/api/games/cancel`**
2. **✅ Start using `/innova/cancel`**
3. **❌ Stop using frontend format**
4. **✅ Start using provider callback format**
5. **❌ Stop using `Authorization: Bearer`**
6. **✅ Start using `X-Authorization: hash`**
7. **❌ Stop using `transactionId`**
8. **✅ Start using `transaction_id`**

## 🔧 **Testing the Fix**

### Test with Your Data:
```javascript
// Your transaction details
const transactionId = "2239566";
const accessToken = "cecb0fc413ae3f38ad0583965ba90a91";
const userId = 48;

// Test the correct cancellation
const result = await cancelBet(transactionId, accessToken, userId);
console.log('Result:', result);
```

### Expected Success Response:
```json
{
  "request": {
    "command": "cancel",
    "data": {
      "transaction_id": "2239566"
    }
  },
  "response": {
    "status": "OK",
    "data": {
      "transaction_id": "2239566",
      "transaction_status": "CANCELED",
      "balance": 50.20,
      "currency_code": "USD"
    }
  }
}
```

## 🚨 **Common Mistakes to Avoid**

1. **❌ Using wrong endpoint**: `/api/games/cancel` instead of `/innova/cancel`
2. **❌ Using wrong format**: Frontend format instead of provider callback format
3. **❌ Using wrong headers**: `Authorization: Bearer` instead of `X-Authorization: hash`
4. **❌ Using wrong field names**: `transactionId` instead of `transaction_id`
5. **❌ Not validating first**: Always validate before attempting cancellation
6. **❌ Not handling errors**: Always handle provider callback errors properly

## 📞 **Next Steps**

1. **Update your admin frontend** to use the provider callback system
2. **Test with the provided code** using your transaction data
3. **Verify the cancellation** works correctly
4. **Update your documentation** to reflect the correct process
5. **Monitor for any errors** and handle them appropriately

The key is to use the **provider callback system** (`/innova/cancel`) instead of the **frontend endpoint** (`/api/games/cancel`)! 🎯 