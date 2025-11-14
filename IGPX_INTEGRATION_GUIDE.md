# IGPX Sportsbook Integration Guide

## Overview

IGPX Sportsbook is now fully integrated into our payment gateway system. This integration allows users to access sports betting services through an iframe-based interface with real-time balance synchronization.

## Features

- **Seamless Integration**: Direct iframe integration for sports betting
- **Real-time Balance Sync**: Automatic balance updates for bets and wins
- **Secure Authentication**: Token-based authentication with IGPX
- **Transaction Handling**: Support for bet, result, and rollback transactions
- **Webhook Processing**: Secure callback handling with HMAC verification

## Setup Instructions

### 1. Admin Configuration

First, create the IGPX payment gateway through the admin API:

```bash
curl -X POST http://localhost:3000/api/admin/payment-gateways \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "IGPX Sportsbook",
    "code": "igpx",
    "type": "both",
    "description": "Sports betting platform integration",
    "api_endpoint": "https://api.igpx-sportsbook.com",
    "api_key": "YOUR_CLIENT_USERNAME",
    "api_secret": "YOUR_CLIENT_PASSWORD",
    "webhook_url": "https://yourdomain.com/api/payment/webhook/igpx",
    "webhook_secret": "YOUR_SECURITY_HASH",
    "supported_currencies": ["USD", "EUR", "GBP"],
    "min_amount": 1.00,
    "max_amount": 10000.00,
    "fees_percentage": 0,
    "fees_fixed": 0,
    "auto_approval": true,
    "requires_kyc": false,
    "config": {
      "sandbox_mode": false
    }
  }'
```

### 2. Required IGPX Credentials

You need to provide IGPX with the following information:

#### Staging Environment
- **Server IP Address**: Your server's public IP
- **Callback URL**: `https://yourdomain.com/api/payment/webhook/igpx`
- **Website URL**: `https://yourdomain.com`
- **Supported Currencies**: USD, EUR, GBP (or your preferred currencies)
- **Supported Languages**: en, es, fr (or your preferred languages)

#### Production Environment
- **API URL**: `https://api.igpx-sportsbook.com`
- **API Version**: Latest version
- **CLIENT_USERNAME**: Provided by IGPX
- **CLIENT_PASSWORD**: Provided by IGPX
- **SECURITY_HASH**: Provided by IGPX for webhook verification

### 3. Webhook Configuration

The webhook endpoint is automatically available at:
```
POST https://yourdomain.com/api/payment/webhook/igpx
```

**Headers Required:**
- `X-Security-Hash`: SHA256 HMAC of the request body using your SECURITY_HASH

## API Endpoints

### 1. Create IGPX Session (User)

```http
POST /api/payment/create
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "gateway_id": <igpx_gateway_id>,
  "amount": 0,
  "currency": "USD",
  "type": "deposit",
  "description": "IGPX Sportsbook Session",
  "metadata": {
    "language": "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "igpx_123_1234567890_abc123",
    "payment_url": "https://igpx-sportsbook.com/session/abc123",
    "status": "pending",
    "amount": 0,
    "currency": "USD",
    "gateway_name": "IGPX Sportsbook",
    "order_id": "igpx_123_1234567890_abc123"
  }
}
```

### 2. IGPX Webhook Endpoint

```http
POST /api/payment/webhook/igpx
X-Security-Hash: <hmac_signature>
Content-Type: application/json

{
  "transaction_id": "igpx_txn_123",
  "action": "bet",
  "user_id": "123",
  "currency": "USD",
  "amount": 50.00
}
```

**Response:**
```json
{
  "error": null
}
```

## Transaction Types

### 1. Bet Transaction
- **Action**: `"bet"`
- **Effect**: Deducts amount from user balance
- **Purpose**: When user places a bet

### 2. Result Transaction
- **Action**: `"result"`
- **Effect**: Adds amount to user balance
- **Purpose**: When user wins a bet

### 3. Rollback Transaction
- **Action**: `"rollback"`
- **Effect**: Restores balance from original transaction
- **Purpose**: When a bet needs to be cancelled/refunded

## Implementation Details

### Authentication Flow
1. System authenticates with IGPX using CLIENT_USERNAME and CLIENT_PASSWORD
2. Receives authentication token with expiration time
3. Uses token for subsequent API calls

### Session Creation Flow
1. User requests IGPX session
2. System calls IGPX `/start-session` endpoint
3. IGPX returns iframe URL
4. User accesses sportsbook through iframe

### Transaction Processing Flow
1. IGPX sends webhook with transaction details
2. System verifies HMAC signature
3. System processes transaction based on action type
4. System updates user balance accordingly
5. System returns success response to IGPX

## Error Handling

### Common Error Responses

```json
{
  "error": "Invalid security hash"
}
```

```json
{
  "error": "IGPX gateway not available"
}
```

```json
{
  "error": "Missing required fields in IGPX webhook"
}
```

### Transaction Duplication Protection
- System checks for duplicate `transaction_id`
- Duplicate transactions are ignored (idempotent)
- Same response is returned for duplicate requests

## Security Considerations

### HMAC Verification
- All webhooks are verified using SHA256 HMAC
- Uses SECURITY_HASH as the secret key
- Invalid signatures are rejected

### Token Management
- Authentication tokens have expiration times
- Tokens are automatically refreshed when needed
- Failed authentication triggers error responses

### Transaction Validation
- All required fields are validated
- Amount and currency are verified
- User existence is confirmed before processing

## Testing

### Test Webhook
```bash
curl -X POST https://yourdomain.com/api/payment/webhook/igpx \
  -H "Content-Type: application/json" \
  -H "X-Security-Hash: <calculated_hmac>" \
  -d '{
    "transaction_id": "test_txn_123",
    "action": "bet",
    "user_id": "123",
    "currency": "USD",
    "amount": 10.00
  }'
```

### Test Session Creation
```bash
curl -X POST https://yourdomain.com/api/payment/create \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "gateway_id": <igpx_gateway_id>,
    "amount": 0,
    "currency": "USD",
    "type": "deposit",
    "description": "Test IGPX Session"
  }'
```

## Monitoring and Logging

### Webhook Logs
All IGPX webhooks are logged with:
- Transaction ID
- Action type
- User ID
- Amount and currency
- Processing status

### Error Logs
Failed webhook processing is logged with:
- Error message
- Request data
- Stack trace (if applicable)

### Balance Updates
All balance changes are tracked in the transactions table with:
- IGPX transaction ID
- Action type
- Amount and currency
- User ID

## Troubleshooting

### Common Issues

1. **Invalid Security Hash**
   - Verify SECURITY_HASH is correct
   - Check HMAC calculation method
   - Ensure request body format matches

2. **Gateway Not Found**
   - Verify IGPX gateway is created in database
   - Check gateway is active
   - Confirm gateway code is 'igpx'

3. **Authentication Failed**
   - Verify CLIENT_USERNAME and CLIENT_PASSWORD
   - Check API endpoint URL
   - Ensure credentials are active

4. **Transaction Processing Failed**
   - Check user exists in database
   - Verify user has sufficient balance
   - Check transaction ID uniqueness

### Debug Endpoints

Use these admin endpoints for debugging:

```bash
# Check IGPX gateway status
GET /api/admin/payment-gateways?code=igpx

# Test gateway connection
POST /api/admin/payment-gateways/{id}/test

# View gateway statistics
GET /api/admin/payment-gateways/{id}/stats
```

## Support

For IGPX-specific issues:
1. Check IGPX API documentation
2. Verify credentials with IGPX support
3. Test webhook endpoints
4. Review server logs for errors

For integration issues:
1. Check payment gateway configuration
2. Verify webhook endpoint accessibility
3. Test authentication flow
4. Review transaction processing logs 