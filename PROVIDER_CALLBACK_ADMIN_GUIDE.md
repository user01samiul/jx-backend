# Provider Callback Admin Panel Implementation Guide

## Overview
This guide provides all the necessary endpoints and implementation details for integrating provider callbacks into your admin panel.

## Base URL
```
https://backend.jackpotx.net/innova/
```

## Authentication
All endpoints require the `X-Authorization` header:
```
X-Authorization: {SHA1 hash of command + secret_key}
```

**Secret Key**: `2xk3SrX09oQ71Z3F`

## Endpoints Summary

### 1. Authenticate User Session
**Endpoint**: `POST /innova/authenticate`

**Purpose**: Authenticate user and get session info

**Request**:
```json
{
  "command": "authenticate",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "token": "user_token_here",
    "game_id": 43
  }
}
```

**Response**:
```json
{
  "request": { ... },
  "response": {
    "status": "OK",
    "response_timestamp": "2025-08-08 00:00:00",
    "hash": "def456ghi789...",
    "data": {
      "user_id": "48",
      "username": "player50",
      "balance": 50.00,
      "currency_code": "USD",
      "country_code": "US",
      "country_name": "United States",
      "game_id": 43,
      "category": "slots",
      "category_balance": 50.00
    }
  }
}
```

---

### 2. Get User Balance
**Endpoint**: `POST /innova/balance`

**Purpose**: Check current user balance

**Request**:
```json
{
  "command": "balance",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "token": "user_token_here",
    "game_id": 43
  }
}
```

**Response**:
```json
{
  "request": { ... },
  "response": {
    "status": "OK",
    "response_timestamp": "2025-08-08 00:00:00",
    "hash": "def456ghi789...",
    "data": {
      "user_id": "48",
      "balance": 50.00,
      "currency_code": "USD"
    }
  }
}
```

---

### 3. Change Balance (Bet/Win)
**Endpoint**: `POST /innova/changebalance`

**Purpose**: Process bets and wins

**Request (Bet)**:
```json
{
  "command": "changebalance",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "token": "user_token_here",
    "user_id": 48,
    "amount": -0.20,
    "transaction_id": "2239560",
    "game_id": 43,
    "session_id": "session_123",
    "currency_code": "USD"
  }
}
```

**Request (Win)**:
```json
{
  "command": "changebalance",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "token": "user_token_here",
    "user_id": 48,
    "amount": 1.10,
    "transaction_id": "2239561",
    "game_id": 43,
    "session_id": "session_123",
    "currency_code": "USD",
    "type": "WIN"
  }
}
```

**Response**:
```json
{
  "request": { ... },
  "response": {
    "status": "OK",
    "response_timestamp": "2025-08-08 00:00:00",
    "hash": "def456ghi789...",
    "data": {
      "user_id": "48",
      "transaction_id": "2239560",
      "balance": 49.80,
      "currency_code": "USD"
    }
  }
}
```

---

### 4. Check Transaction Status
**Endpoint**: `POST /innova/status`

**Purpose**: Verify transaction processing status

**Request**:
```json
{
  "command": "status",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "transaction_id": "2239560",
    "token": "user_token_here"
  }
}
```

**Response**:
```json
{
  "request": { ... },
  "response": {
    "status": "OK",
    "response_timestamp": "2025-08-08 00:00:00",
    "hash": "def456ghi789...",
    "data": {
      "user_id": "48",
      "transaction_id": "2239560",
      "transaction_status": "completed",
      "balance": 49.80,
      "currency_code": "USD"
    }
  }
}
```

---

### 5. Cancel Transaction
**Endpoint**: `POST /innova/cancel`

**Purpose**: Cancel and refund a transaction

**Request**:
```json
{
  "command": "cancel",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "transaction_id": "2239560",
    "token": "user_token_here",
    "user_id": 48
  }
}
```

**Response**:
```json
{
  "request": { ... },
  "response": {
    "status": "OK",
    "response_timestamp": "2025-08-08 00:00:00",
    "hash": "def456ghi789...",
    "data": {
      "user_id": "48",
      "transaction_id": "2239560",
      "transaction_status": "CANCELED",
      "balance": 50.00,
      "currency_code": "USD"
    }
  }
}
```

---

### 6. Finish Game Round
**Endpoint**: `POST /innova/finishround`

**Purpose**: Mark game round as finished

**Request**:
```json
{
  "command": "finishround",
  "request_timestamp": "2025-08-08 00:00:00",
  "hash": "abc123def456...",
  "data": {
    "token": "user_token_here",
    "round_id": "round_123",
    "game_id": 43
  }
}
```

**Response**:
```json
{
  "request": { ... },
  "response": {
    "status": "OK",
    "response_timestamp": "2025-08-08 00:00:00",
    "hash": "def456ghi789...",
    "data": {
      "user_id": "48",
      "round_id": "round_123",
      "round_status": "finished",
      "balance": 50.00,
      "currency_code": "USD"
    }
  }
}
```

---

### 7. Health Check
**Endpoint**: `GET /innova/ping`

**Purpose**: Verify service health

**Request**: No body required

**Response**:
```json
{
  "request": {},
  "response": {
    "status": "OK",
    "response_timestamp": "2025-08-08 00:00:00",
    "hash": "def456ghi789...",
    "data": {
      "status": "OK",
      "timestamp": "2025-08-08T00:00:00.000Z"
    }
  }
}
```

---

## Error Responses

All endpoints can return error responses:

```json
{
  "status": "ERROR",
  "response_timestamp": "2025-08-08 00:00:00",
  "error_code": "OP_21",
  "error_message": "User not found or token expired"
}
```

**Common Error Codes**:
- `OP_21`: Authentication error (invalid token, user not found)
- `OP_35`: Game disabled
- `OP_41`: Transaction not found
- `OP_99`: Internal server error

---

## Hash Generation

For all requests, generate the hash as:
```javascript
const hash = crypto.createHash('sha1')
  .update(command + request_timestamp + secret_key)
  .digest('hex');
```

For the X-Authorization header:
```javascript
const authHeader = crypto.createHash('sha1')
  .update(command + secret_key)
  .digest('hex');
```

---

## Admin Panel Integration Examples

### JavaScript/Node.js Example
```javascript
const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://backend.jackpotx.net/innova';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

function generateHash(command, timestamp) {
  return crypto.createHash('sha1')
    .update(command + timestamp + SECRET_KEY)
    .digest('hex');
}

function generateAuthHeader(command) {
  return crypto.createHash('sha1')
    .update(command + SECRET_KEY)
    .digest('hex');
}

async function cancelTransaction(transactionId, token, userId) {
  const command = 'cancel';
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  const request = {
    command,
    request_timestamp: timestamp,
    hash: generateHash(command, timestamp),
    data: {
      transaction_id: transactionId,
      token,
      user_id: userId
    }
  };

  try {
    const response = await axios.post(`${BASE_URL}/cancel`, request, {
      headers: {
        'X-Authorization': generateAuthHeader(command),
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Cancel error:', error.response?.data || error.message);
    throw error;
  }
}
```

### PHP Example
```php
<?php
$baseUrl = 'https://backend.jackpotx.net/innova';
$secretKey = '2xk3SrX09oQ71Z3F';

function generateHash($command, $timestamp) {
    return sha1($command . $timestamp . $secretKey);
}

function generateAuthHeader($command) {
    return sha1($command . $secretKey);
}

function cancelTransaction($transactionId, $token, $userId) {
    global $baseUrl;
    
    $command = 'cancel';
    $timestamp = date('Y-m-d H:i:s');
    
    $request = [
        'command' => $command,
        'request_timestamp' => $timestamp,
        'hash' => generateHash($command, $timestamp),
        'data' => [
            'transaction_id' => $transactionId,
            'token' => $token,
            'user_id' => $userId
        ]
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $baseUrl . '/cancel');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($request));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Authorization: ' . generateAuthHeader($command),
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}
?>
```

### Python Example
```python
import requests
import hashlib
from datetime import datetime

BASE_URL = 'https://backend.jackpotx.net/innova'
SECRET_KEY = '2xk3SrX09oQ71Z3F'

def generate_hash(command, timestamp):
    return hashlib.sha1(f"{command}{timestamp}{SECRET_KEY}".encode()).hexdigest()

def generate_auth_header(command):
    return hashlib.sha1(f"{command}{SECRET_KEY}".encode()).hexdigest()

def cancel_transaction(transaction_id, token, user_id):
    command = 'cancel'
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    request_data = {
        'command': command,
        'request_timestamp': timestamp,
        'hash': generate_hash(command, timestamp),
        'data': {
            'transaction_id': transaction_id,
            'token': token,
            'user_id': user_id
        }
    }
    
    headers = {
        'X-Authorization': generate_auth_header(command),
        'Content-Type': 'application/json'
    }
    
    response = requests.post(f"{BASE_URL}/cancel", json=request_data, headers=headers)
    return response.json()
```

---

## Testing Checklist

### ✅ Pre-Implementation Testing
- [ ] Verify all endpoints are accessible
- [ ] Test authentication with valid tokens
- [ ] Test error handling with invalid requests
- [ ] Verify hash generation is correct
- [ ] Test with disabled games

### ✅ Post-Implementation Testing
- [ ] Test bet placement and balance deduction
- [ ] Test win processing and balance addition
- [ ] Test transaction cancellation and refund
- [ ] Test balance consistency after operations
- [ ] Test error scenarios and edge cases

---

## Security Considerations

1. **Secret Key Protection**: Never expose the secret key in client-side code
2. **Token Validation**: Always validate user tokens before processing
3. **Hash Verification**: Verify request hashes to prevent tampering
4. **Rate Limiting**: Implement rate limiting for production use
5. **Logging**: Log all provider callback requests for audit trails

---

## Monitoring & Debugging

### Key Metrics to Monitor
- Transaction success/failure rates
- Balance consistency
- Response times
- Error rates by error code
- Cancellation success rates

### Debug Endpoints
- Use `/innova/ping` for health checks
- Monitor server logs for detailed debugging
- Check transaction status for failed operations

---

## Support

For implementation support or questions:
- Check the Swagger documentation at `/api-docs`
- Review server logs for detailed error information
- Test with the provided examples before production deployment 