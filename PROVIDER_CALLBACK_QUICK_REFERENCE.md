# Provider Callback Quick Reference Card

## 🔑 Authentication
```
X-Authorization: {SHA1(command + secret_key)}
Secret Key: 2xk3SrX09oQ71Z3F
```

## 📍 Base URL
```
https://backend.jackpotx.net/innova/
```

## 🚀 Quick Start

### 1. Authenticate User
```bash
POST /innova/authenticate
{
  "command": "authenticate",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "{SHA1(command + timestamp + secret)}",
  "data": {
    "token": "user_token",
    "game_id": 43
  }
}
```

### 2. Check Balance
```bash
POST /innova/balance
{
  "command": "balance",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "{SHA1(command + timestamp + secret)}",
  "data": {
    "token": "user_token",
    "game_id": 43
  }
}
```

### 3. Place Bet
```bash
POST /innova/changebalance
{
  "command": "changebalance",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "{SHA1(command + timestamp + secret)}",
  "data": {
    "token": "user_token",
    "user_id": 48,
    "amount": -0.20,
    "transaction_id": "unique_id",
    "game_id": 43,
    "currency_code": "USD"
  }
}
```

### 4. Process Win
```bash
POST /innova/changebalance
{
  "command": "changebalance",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "{SHA1(command + timestamp + secret)}",
  "data": {
    "token": "user_token",
    "user_id": 48,
    "amount": 1.10,
    "transaction_id": "unique_id",
    "game_id": 43,
    "currency_code": "USD",
    "type": "WIN"
  }
}
```

### 5. Cancel Transaction
```bash
POST /innova/cancel
{
  "command": "cancel",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "{SHA1(command + timestamp + secret)}",
  "data": {
    "transaction_id": "transaction_id",
    "token": "user_token",
    "user_id": 48
  }
}
```

### 6. Check Transaction Status
```bash
POST /innova/status
{
  "command": "status",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "{SHA1(command + timestamp + secret)}",
  "data": {
    "transaction_id": "transaction_id",
    "token": "user_token"
  }
}
```

### 7. Health Check
```bash
GET /innova/ping
```

## 📊 Response Format
```json
{
  "request": { ... },
  "response": {
    "status": "OK",
    "response_timestamp": "2025-08-08 00:00:00",
    "hash": "{response_hash}",
    "data": {
      "user_id": "48",
      "balance": 50.00,
      "currency_code": "USD"
    }
  }
}
```

## ❌ Error Format
```json
{
  "status": "ERROR",
  "response_timestamp": "2025-08-08 00:00:00",
  "error_code": "OP_21",
  "error_message": "User not found or token expired"
}
```

## 🔧 Hash Generation
```javascript
// Request hash
const hash = crypto.createHash('sha1')
  .update(command + request_timestamp + secret_key)
  .digest('hex');

// Auth header
const authHeader = crypto.createHash('sha1')
  .update(command + secret_key)
  .digest('hex');
```

## 🎯 Key Features
- ✅ **Real-time balance updates**
- ✅ **Transaction cancellation support**
- ✅ **Category-specific balances**
- ✅ **Disabled game handling**
- ✅ **Comprehensive error handling**
- ✅ **Audit trail maintenance**

## 📝 Notes
- All amounts are in decimal format (e.g., 0.20, 1.10)
- Negative amounts for bets, positive for wins
- Transaction IDs must be unique
- Timestamps in YYYY-MM-DD HH:mm:ss format
- Works with disabled games for testing 