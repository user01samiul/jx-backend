# Vimplay Integration Guide

## Overview

Vimplay is now fully integrated into the JackpotX backend as a game provider with wallet integration. This integration allows users to play Vimplay games with real-time balance synchronization through callback endpoints.

## Features

- **Game Launch**: Launch Vimplay games via API integration
- **Real-time Balance Sync**: Automatic balance updates for bets, wins, and refunds
- **Transaction Types**:
  - **Debit (Bet)**: Deduct balance when user places bet
  - **Credit (Win)**: Add winnings to balance
  - **BetWin**: Combined bet+win for instant games
  - **Refund**: Reverse transactions
- **Idempotency**: Duplicate transaction handling
- **Session Management**: Token-based authentication

## Architecture

### 1. Game Launch Flow

```
Frontend → Backend → Vimplay API
                ↓
        Get Game URL
                ↓
        Add External Token
                ↓
        Return URL to Frontend
```

### 2. Callback Flow

```
Vimplay → Backend Callback Endpoints
            ↓
    Process Transaction
            ↓
    Update Balance
            ↓
    Return Response
```

## Configuration

### 1. Database Setup

Add Vimplay configuration to `payment_gateways` table:

```sql
INSERT INTO payment_gateways (
  name,
  code,
  type,
  description,
  api_endpoint,
  api_key,
  api_secret,
  is_active,
  config,
  supported_currencies,
  supported_countries,
  min_amount,
  max_amount
) VALUES (
  'Vimplay',
  'vimplay',
  'both',
  'Vimplay game provider integration',
  'https://vimplay-api-endpoint.com',  -- Provided by Vimplay
  'Bearer_Token_From_Vimplay',          -- Provided by Vimplay
  '',                                    -- Not used for Vimplay
  true,
  '{"site_id": "YOUR_SITE_ID"}',        -- Provided by Vimplay
  '{"USD", "EUR", "GBP"}',
  '{"ALL"}',
  0.00,
  100000.00
);
```

### 2. Environment Variables

Add to your `.env` file:

```env
VIMPLAY_ENDPOINT=https://vimplay-api-endpoint.com
VIMPLAY_TOKEN=Bearer_Token_From_Vimplay
VIMPLAY_SITE_ID=12345
```

### 3. Callback URL Configuration

Provide Vimplay with your callback URL base:
```
https://backend.jackpotx.net/vimplay
```

Vimplay will call these endpoints:
- `POST /vimplay/authenticate`
- `POST /vimplay/debit`
- `POST /vimplay/credit`
- `POST /vimplay/betwin`
- `POST /vimplay/refund`

## API Endpoints

### User-Facing Endpoints

#### Launch Game

**Endpoint:** `POST /api/payment/create`

**Request:**
```json
{
  "gateway_id": <vimplay_gateway_id>,
  "amount": 0,
  "currency": "USD",
  "type": "deposit",
  "description": "Vimplay Game Session",
  "metadata": {
    "game_id": "123",
    "language": "en",
    "game_mode": "real",
    "nickname": "Player123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "vimplay_123_1234567890",
    "payment_url": "https://vimplay-game.com/play?token=xxx&externalToken=yyy",
    "status": "pending",
    "gateway_response": {
      "gameUrl": "https://vimplay-game.com/play?token=xxx",
      "finalUrl": "https://vimplay-game.com/play?token=xxx&externalToken=yyy",
      "gameId": "123",
      "playerId": "user_456"
    }
  }
}
```

### Callback Endpoints (Called by Vimplay)

#### 1. Authenticate

**Endpoint:** `POST /vimplay/authenticate`

**Request:**
```json
{
  "token": "user_session_token"
}
```

**Response:**
```json
{
  "balance": 100.50,
  "player_id": "123",
  "token": "user_session_token"
}
```

**Status Codes:**
- `111` - Success
- `888` - Session expired

#### 2. Debit (Bet)

**Endpoint:** `POST /vimplay/debit`

**Request:**
```json
{
  "siteId": 12345,
  "playerId": "123",
  "token": "user_token",
  "currency": "USD",
  "roundId": "round_abc123",
  "gameId": 456,
  "trnasaction": {
    "transactionId": "txn_xyz789",
    "betAmount": 10.00,
    "inGameBouns": false,
    "bonusId": "bonus_123"
  }
}
```

**Response:**
```json
{
  "balance": 90.50,
  "playerId": "123",
  "transaction": {
    "status": 111,
    "transactionId": "txn_xyz789",
    "partnerTransactionId": "txn_xyz789"
  }
}
```

**Status Codes:**
- `111` - Success
- `666` - Insufficient balance
- `555` - Duplicate transaction
- `999` - General error

#### 3. Credit (Win)

**Endpoint:** `POST /vimplay/credit`

**Request:**
```json
{
  "siteId": 12345,
  "playerId": "123",
  "token": "user_token",
  "currency": "USD",
  "roundId": "round_abc123",
  "gameId": 456,
  "transaction": {
    "transactionId": "txn_win_123",
    "betAmount": 10.00,
    "inGameBouns": false,
    "bonusId": null,
    "winAmount": 50.00,
    "betTransactionId": "txn_xyz789"
  }
}
```

**Response:**
```json
{
  "balance": 140.50,
  "playerId": "123",
  "transaction": {
    "status": 111,
    "transactionId": "txn_win_123",
    "partnerTransactionId": "txn_win_123"
  }
}
```

#### 4. BetWin (Combined)

**Endpoint:** `POST /vimplay/betwin`

**Request:**
```json
{
  "siteId": 12345,
  "playerId": "123",
  "token": "user_token",
  "currency": "USD",
  "roundId": "round_instant_123",
  "gameId": 456,
  "trnasaction": {
    "transactionId": "txn_betwin_456",
    "betAmount": 10.00,
    "bonusId": null,
    "inGameBouns": false,
    "winAmount": 25.00
  }
}
```

**Response:**
```json
{
  "balance": 115.50,
  "playerId": "123",
  "transaction": {
    "status": 111,
    "transactionId": "txn_betwin_456",
    "partnerTransactionId": "txn_betwin_456"
  }
}
```

**Note:** If `inGameBouns` is `true`, only win amount is added (bet is not subtracted).

#### 5. Refund

**Endpoint:** `POST /vimplay/refund`

**Request:**
```json
{
  "transactionId": "txn_xyz789",
  "token": "user_token",
  "playerId": "123",
  "gameId": "456"
}
```

**Response:**
```json
{
  "status": 111,
  "balance": 100.50
}
```

## Status Codes

| Code | Description |
|------|-------------|
| `111` | Success |
| `666` | Insufficient balance |
| `555` | Duplicate transaction |
| `888` | Session expired |
| `999` | General error |

## Transaction Flow Examples

### Example 1: Normal Bet and Win

1. **User places bet ($10)**
   ```
   POST /vimplay/debit
   → Balance: $100 - $10 = $90
   → Status: 111 (Success)
   ```

2. **User wins ($50)**
   ```
   POST /vimplay/credit
   → Balance: $90 + $50 = $140
   → Status: 111 (Success)
   ```

### Example 2: Instant Game (BetWin)

1. **User plays instant game (bet $10, win $25)**
   ```
   POST /vimplay/betwin
   → Balance: $100 - $10 + $25 = $115
   → Status: 111 (Success)
   ```

### Example 3: Insufficient Balance

1. **User tries to bet $200 with $100 balance**
   ```
   POST /vimplay/debit
   → Balance: $100 (unchanged)
   → Status: 666 (Insufficient balance)
   ```

### Example 4: Transaction Refund

1. **Refund bet transaction**
   ```
   POST /vimplay/refund
   → Balance: $90 + $10 = $100
   → Status: 111 (Success)
   ```

## Database Schema

### Transactions Table

All Vimplay transactions are stored in the `transactions` table with metadata:

```json
{
  "vimplay_action": "debit|credit|betwin|refund",
  "vimplay_transaction_id": "txn_xyz789",
  "vimplay_processed": "true",
  "round_id": "round_abc123",
  "game_id": 456,
  "site_id": 12345,
  "bet_amount": 10.00,
  "win_amount": 50.00,
  "in_game_bonus": false,
  "bonus_id": "bonus_123",
  "balance_before": 100.00,
  "balance_after": 90.00
}
```

## Error Handling

All endpoints return status code `200` with error information in the response body:

```json
{
  "status": 999,
  "balance": 0,
  "playerId": "123",
  "transaction": {
    "status": 999,
    "transactionId": "txn_xyz789",
    "partnerTransactionId": "txn_xyz789"
  }
}
```

## Security Features

1. **Token Validation**: All requests validate user session tokens
2. **Idempotency**: Duplicate transactions are detected and handled
3. **Database Transactions**: Balance updates use PostgreSQL transactions with row-level locking
4. **Balance Consistency**: All operations ensure accurate balance tracking

## Testing

### Test Authentication

```bash
curl -X POST https://backend.jackpotx.net/vimplay/authenticate \
  -H "Content-Type: application/json" \
  -d '{"token": "your_test_token"}'
```

### Test Debit

```bash
curl -X POST https://backend.jackpotx.net/vimplay/debit \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": 12345,
    "playerId": "1",
    "token": "test_token",
    "currency": "USD",
    "roundId": "test_round_001",
    "gameId": 123,
    "trnasaction": {
      "transactionId": "test_txn_001",
      "betAmount": 10.00,
      "inGameBouns": false
    }
  }'
```

## Troubleshooting

### Issue: "Session Expired" (Status 888)

**Cause**: Invalid or expired user token

**Solution**: Ensure user is logged in and token is valid

### Issue: "Insufficient Balance" (Status 666)

**Cause**: User balance is less than bet amount

**Solution**: User needs to deposit more funds

### Issue: "Duplicate Transaction" (Status 555)

**Cause**: Same transaction ID sent multiple times

**Solution**: This is normal - idempotency is working correctly

### Issue: "General Error" (Status 999)

**Cause**: Unexpected server error

**Solution**: Check server logs for detailed error information

## Monitoring

Monitor these logs for Vimplay operations:

```bash
# View Vimplay logs
pm2 logs backend | grep "\[VIMPLAY\]"

# Common log patterns
[VIMPLAY] Authenticate request
[VIMPLAY] Auth successful: User 123, Balance: 100.50
[VIMPLAY] Processing debit: User 123, Amount: 10, TxID: txn_xyz
[VIMPLAY] Debit processed: User 123, Balance: 100 -> 90
[VIMPLAY] Duplicate debit transaction: txn_xyz
[VIMPLAY] Launching game: gameId 456, playerId 123
```

## Support

For Vimplay-related issues:

1. Check server logs: `pm2 logs backend | grep VIMPLAY`
2. Verify database configuration in `payment_gateways` table
3. Confirm callback URL is correctly registered with Vimplay
4. Test endpoints using provided curl examples
5. Contact Vimplay support for API-level issues

## Next Steps

1. ✅ Add Vimplay to database (see Configuration section)
2. ✅ Register callback URL with Vimplay
3. ✅ Test game launch flow
4. ✅ Test callback endpoints
5. ✅ Monitor transactions in production
6. ✅ Add Vimplay games to your games catalog

## Related Files

- Service: `src/services/payment/vimplay-callback.service.ts`
- Routes: `src/routes/vimplay.routes.ts`
- Payment Integration: `src/services/payment/payment-integration.service.ts`
- App Configuration: `src/app.ts`
