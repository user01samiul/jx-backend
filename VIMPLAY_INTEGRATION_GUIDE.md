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

Vimplay is configured as a **game provider** (not a payment gateway) and is stored in the `game_provider_configs` table:

```sql
INSERT INTO game_provider_configs (
  provider_name,
  api_key,
  api_secret,
  base_url,
  is_active,
  metadata
) VALUES (
  'Vimplay',
  'e60eedfa6fb4549fcc5dda03acce2630ad974f57d6131cdf46d057fb54d68acc',  -- Staging token
  '',                                    -- Not used for Vimplay
  'https://api.int-vimplay.com/',       -- Staging environment
  true,
  '{"site_id": "243", "currency": "USD", "partner_secret": "e60eedfa6fb4549fcc5dda03acce2630ad974f57d6131cdf46d057fb54d68acc"}'::jsonb
);
```

**Important Notes**:
- Vimplay is stored in `game_provider_configs` (not `payment_gateways`) as it's a game provider
- This makes Vimplay appear in `/api/admin/providers` endpoint
- The backend automatically handles Vimplay differently when launching games via `/api/payment/create`
- The system normalizes the config structure from `game_provider_configs` to work with the payment service

### 2. Environment Variables

Add to your `.env` file:

```env
# Vimplay Staging Environment Credentials
VIMPLAY_ENDPOINT=https://api.int-vimplay.com/
VIMPLAY_TOKEN=e60eedfa6fb4549fcc5dda03acce2630ad974f57d6131cdf46d057fb54d68acc
VIMPLAY_SITE_ID=243
VIMPLAY_PARTNER_SECRET=e60eedfa6fb4549fcc5dda03acce2630ad974f57d6131cdf46d057fb54d68acc
VIMPLAY_CURRENCY=USD
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

### Partner Integration Endpoints

#### Get Game List

**Endpoint:** `POST /vimplay/api/games/partner/list`

**Description:** Retrieve list of available games for VimPlay integration

**Request:**
```json
{
  "secret": "PARTNER_SECRET"
}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Game Name",
    "images": {
      "ls": {
        "org": "https://backend.jackpotx.net/uploads/game.jpg",
        "avif": "https://backend.jackpotx.net/uploads/game.avif",
        "webp": "https://backend.jackpotx.net/uploads/game.webp"
      },
      "pr": {
        "org": "https://backend.jackpotx.net/uploads/game.jpg",
        "avif": "https://backend.jackpotx.net/uploads/game.avif",
        "webp": "https://backend.jackpotx.net/uploads/game.webp"
      },
      "sq": {
        "org": "https://backend.jackpotx.net/uploads/game.jpg",
        "avif": "https://backend.jackpotx.net/uploads/game.avif",
        "webp": "https://backend.jackpotx.net/uploads/game.webp"
      }
    },
    "type": "slot"
  }
]
```

**Image Types:**
- `ls` - Landscape format
- `pr` - Portrait format
- `sq` - Square format

Each format provides 3 versions: original (org), AVIF, and WebP

**Error Response (403):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid secret or access denied"
}
```

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
  "siteId": 243,
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
  "siteId": 243,
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
  "siteId": 243,
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
  "site_id": 243,
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

### Test Game List

```bash
curl -X POST https://backend.jackpotx.net/vimplay/api/games/partner/list \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your_partner_secret"
  }'
```

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
    "siteId": 243,
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

## Game Synchronization

Vimplay games can be synced to your database using the Admin Game Import APIs (same as Timeless/Innova):

### Sync All Vimplay Games
```http
POST /api/admin/import-all-games
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "provider_name": "Vimplay"
}

Response:
{
  "success": true,
  "message": "Imported all categories",
  "results": [
    {
      "category": "slot",
      "imported_count": 150,
      "updated_count": 0,
      "failed_count": 0
    },
    {
      "category": "table",
      "imported_count": 25,
      "updated_count": 0,
      "failed_count": 0
    }
  ]
}
```

### Sync Games by Category
```http
POST /api/admin/import-games
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "provider_name": "Vimplay",
  "category": "slot",
  "limit": 100,
  "offset": 0,
  "force_update": false
}
```

### Sync Single Game by ID
```http
POST /api/admin/import-game
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "provider_name": "Vimplay",
  "game_id": "123",
  "force_update": true
}
```

### Check Import Status
```http
GET /api/admin/game-import/status
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "total_games": 175,
    "providers": {
      "Vimplay": 175,
      "Timeless": 500
    }
  }
}
```

**Important Notes:**
- Vimplay's API returns all games in one call (no native pagination)
- The backend automatically filters by category and applies pagination
- Image URLs are transformed from Vimplay's format (ls/pr/sq with org/avif/webp)
- Games are stored with `provider = 'Vimplay'` in the `games` table

## Next Steps

1. ✅ Add Vimplay to database (see Configuration section)
2. ✅ Register callback URL with Vimplay
3. ✅ Sync Vimplay games to your catalog (`POST /api/admin/import-all-games`)
4. ✅ Test game launch flow
5. ✅ Test callback endpoints
6. ✅ Monitor transactions in production

## Related Files

- **Callback Service**: `src/services/payment/vimplay-callback.service.ts` - Handles wallet callbacks (auth, debit, credit, betwin, refund)
- **Routes**: `src/routes/vimplay.routes.ts` - Vimplay callback endpoints
- **Payment Integration**: `src/services/payment/payment-integration.service.ts` - Game launch handler
- **Payment API**: `src/routes/api.ts` - `/api/payment/create` endpoint with Vimplay special handling
- **App Configuration**: `src/app.ts` - Main app setup

## Architecture Notes

**Game Provider vs Payment Gateway**:
- Vimplay is a **game provider**, not a payment gateway
- Stored in `game_provider_configs` table (appears in `/api/admin/providers`)
- When `/api/payment/create` is called with a Vimplay `gateway_id`, the backend automatically:
  1. Checks if the gateway is in `payment_gateways` first
  2. If not found or if code is 'vimplay', fetches from `game_provider_configs`
  3. Normalizes the structure (base_url → api_endpoint, metadata → config)
  4. Passes to `PaymentIntegrationService.handleVimplayPayment()`

**Config Structure Mapping**:
```
game_provider_configs        →    PaymentGatewayConfig
-----------------------           ---------------------
base_url                     →    api_endpoint
metadata.site_id             →    config.site_id
metadata.currency            →    supported_currencies
```
