# Admin Bets API Balance Information Update

## ✅ **Updated: `/api/admin/bets` Endpoint**

The admin bets endpoint has been successfully updated to include `balance_before` and `balance_after` information for each bet.

## 🎯 **Changes Made**

### 1. **Database Query Update**
**File**: `src/routes/admin.routes.ts`
**Lines**: 5320-5330

**Before**:
```sql
SELECT b.id as bet_id, b.user_id, u.username, b.game_id, g.name as game_name, g.category, b.bet_amount, b.win_amount, b.outcome, b.placed_at, b.result_at, t.external_reference as transaction_id, tk.access_token
```

**After**:
```sql
SELECT b.id as bet_id, b.user_id, u.username, b.game_id, g.name as game_name, g.category, b.bet_amount, b.win_amount, b.outcome, b.placed_at, b.result_at, t.external_reference as transaction_id, tk.access_token, t.balance_before, t.balance_after
```

### 2. **Swagger Documentation Update**
**File**: `src/routes/admin.routes.ts`
**Lines**: 5300-5310

Added new fields to the API documentation:
```yaml
balance_before:
  type: number
  description: User balance before the bet was placed
balance_after:
  type: number
  description: User balance after the bet was placed
```

## 📊 **Updated Response Format**

### Before (Missing balance information):
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1977,
      "user_id": 48,
      "username": "player50",
      "game_id": 18,
      "game_name": "Provider Game 18",
      "category": "slots",
      "bet_amount": "0.20",
      "win_amount": "0.24",
      "outcome": "win",
      "placed_at": "2025-08-12T12:16:23.860Z",
      "result_at": "2025-08-12T12:16:24.421Z",
      "transaction_id": "2247047",
      "access_token": "84fe9e4e3a998fe148b22a72eb38b480"
    }
  ]
}
```

### After (Includes balance information):
```json
{
  "success": true,
  "data": [
    {
      "bet_id": 1977,
      "user_id": 48,
      "username": "player50",
      "game_id": 18,
      "game_name": "Provider Game 18",
      "category": "slots",
      "bet_amount": "0.20",
      "win_amount": "0.24",
      "outcome": "win",
      "placed_at": "2025-08-12T12:16:23.860Z",
      "result_at": "2025-08-12T12:16:24.421Z",
      "transaction_id": "2247047",
      "access_token": "84fe9e4e3a998fe148b22a72eb38b480",
      "balance_before": "51.82",
      "balance_after": "51.62"
    }
  ]
}
```

## 🔍 **Database Relationship**

The balance information is retrieved from the `transactions` table:

- **`bets.transaction_id`**: References the transaction record
- **`transactions.balance_before`**: User's balance before the bet was placed
- **`transactions.balance_after`**: User's balance after the bet was placed

### Database Schema:
```sql
-- bets table
id | user_id | game_id | transaction_id | bet_amount | win_amount | outcome | ...

-- transactions table  
id | user_id | type | amount | balance_before | balance_after | status | ...
```

## 🧪 **Testing Results**

### Test 1: Get All Bets (Limit 3)
```bash
curl -X GET "http://localhost:3000/api/admin/bets?limit=3" \
  -H "Authorization: Bearer <admin_token>"
```

**Result**: ✅ Success - Returns 3 bets with balance information

### Test 2: Get User-Specific Bets
```bash
curl -X GET "http://localhost:3000/api/admin/bets?user_id=48&limit=2" \
  -H "Authorization: Bearer <admin_token>"
```

**Result**: ✅ Success - Returns user's bets with balance information

## 🎯 **Benefits**

1. **Complete Transaction History**: Admins can now see the exact balance impact of each bet
2. **Audit Trail**: Full transparency of balance changes for compliance and debugging
3. **User Support**: Better understanding of user balance changes for customer support
4. **Analytics**: Enhanced data for financial analysis and reporting

## 🔄 **API Usage**

### Get All Bets with Balance Info
```http
GET /api/admin/bets?limit=50
Authorization: Bearer <admin_token>
```

### Get User's Bets with Balance Info
```http
GET /api/admin/bets?user_id=48&limit=50
Authorization: Bearer <admin_token>
```

### Response Fields
- `bet_id`: Unique bet identifier
- `user_id`: User who placed the bet
- `username`: User's username
- `game_id`: Game identifier
- `game_name`: Name of the game
- `category`: Game category (slots, table_games, etc.)
- `bet_amount`: Amount wagered
- `win_amount`: Amount won (0 if lost)
- `outcome`: Bet result (win, lose, cancelled)
- `placed_at`: When bet was placed
- `result_at`: When result was processed
- `transaction_id`: External transaction reference
- `access_token`: User's access token for provider callbacks
- **`balance_before`**: User's balance before placing the bet
- **`balance_after`**: User's balance after the bet was processed

## ✅ **Status**

- **Implementation**: ✅ Complete
- **Testing**: ✅ Verified
- **Documentation**: ✅ Updated
- **Deployment**: ✅ Ready for production

The admin bets API now provides complete balance information for enhanced transparency and audit capabilities. 