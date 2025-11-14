# MongoDB Collections Setup for JackpotX Backend

## Overview
This document describes the MongoDB collections that mirror the PostgreSQL tables for transactions, bets, and user category balances.

## Collections Created

### 1. `transactions` Collection
Mirrors the PostgreSQL `transactions` table.

**Structure:**
```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  user_id: Number,                  // User ID (integer)
  type: String,                     // Transaction type: "deposit", "withdrawal", "bet", "win", "bonus", "cashback", "refund", "adjustment", "cancellation"
  amount: Number,                   // Transaction amount (decimal)
  balance_before: Number,           // Balance before transaction
  balance_after: Number,            // Balance after transaction
  currency: String,                 // Currency code (default: "USD")
  reference_id: String,             // Internal reference ID
  external_reference: String,       // External reference (e.g., provider transaction ID)
  payment_method: String,           // Payment method used
  status: String,                   // Status: "pending", "completed", "failed", "cancelled"
  description: String,              // Transaction description
  metadata: Object,                 // JSON metadata (game_id, category, round_id, session_id, etc.)
  created_at: Date,                 // Creation timestamp
  created_by: Number                // User who created the transaction
}
```

**Indexes:**
- `user_id`: For user-specific queries
- `created_at`: For time-based queries
- `external_reference`: For provider transaction lookups
- `status`: For status-based filtering
- `type`: For transaction type filtering
- `user_id + external_reference`: Composite index for user transactions
- `user_id + type + status`: Composite index for user transaction filtering
- `user_id + type + amount + created_at`: Composite index for bet analysis
- `metadata.game_id`: For game-specific queries
- `metadata.session_id`: For session-based queries

### 2. `bets` Collection
Mirrors the PostgreSQL `bets` table.

**Structure:**
```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  user_id: Number,                  // User ID (integer)
  game_id: Number,                  // Game ID (integer)
  transaction_id: ObjectId,         // Reference to transactions collection
  bet_amount: Number,               // Bet amount (decimal)
  win_amount: Number,               // Win amount (decimal, default: 0)
  multiplier: Number,               // Win multiplier
  outcome: String,                  // Outcome: "win", "lose", "pending", "cancelled"
  game_data: Object,                // Game-specific data (JSON)
  placed_at: Date,                  // When bet was placed
  result_at: Date,                  // When result was determined
  session_id: String,               // Game session ID
  created_at: Date,                 // Creation timestamp
  created_by: Number                // User who created the bet
}
```

**Indexes:**
- `user_id`: For user-specific queries
- `game_id`: For game-specific queries
- `outcome`: For outcome-based filtering
- `placed_at`: For time-based queries
- `user_id + outcome`: Composite index for user outcomes
- `transaction_id`: For transaction relationship queries

### 3. `user_category_balances` Collection
Mirrors the PostgreSQL `user_category_balances` table.

**Structure:**
```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  user_id: Number,                  // User ID (integer)
  category: String,                 // Category name (e.g., "slots", "table_games")
  balance: Number                   // Current balance (decimal)
}
```

**Indexes:**
- `user_id + category`: Unique composite index (primary key equivalent)
- `user_id`: For user-specific queries

### 4. `sequences` Collection
Provides auto-incrementing IDs similar to PostgreSQL sequences.

**Structure:**
```javascript
{
  _id: String,                      // Sequence name
  current_value: Number             // Current sequence value
}
```

**Initial Data:**
```javascript
[
  { _id: "transaction_id", current_value: 0 },
  { _id: "bet_id", current_value: 0 }
]
```

## Usage Examples

### Insert a Transaction
```javascript
db.transactions.insertOne({
  user_id: 48,
  type: "bet",
  amount: 1.00,
  balance_before: 50.34,
  balance_after: 49.34,
  currency: "USD",
  external_reference: "2247451",
  status: "completed",
  description: "Bet placed on game 34",
  metadata: {
    game_id: 34,
    category: "slots",
    round_id: 1356140,
    session_id: "test_session_1"
  },
  created_at: new Date(),
  created_by: 1
});
```

### Insert a Bet
```javascript
db.bets.insertOne({
  user_id: 48,
  game_id: 34,
  bet_amount: 1.00,
  win_amount: 0,
  outcome: "pending",
  game_data: {
    bet_type: "straight",
    number: 17,
    chips: 1.00
  },
  placed_at: new Date(),
  session_id: "test_session_1",
  created_at: new Date(),
  created_by: 1
});
```

### Update Category Balance
```javascript
db.user_category_balances.updateOne(
  { user_id: 48, category: "slots" },
  { $set: { balance: 49.34 } },
  { upsert: true }
);
```

### Get Next Sequence Value
```javascript
function getNextSequence(name) {
  var ret = db.sequences.findAndModify({
    query: { _id: name },
    update: { $inc: { current_value: 1 } },
    new: true
  });
  return ret.current_value;
}

// Usage
var nextTransactionId = getNextSequence("transaction_id");
```

## Query Examples

### Get User's Recent Transactions
```javascript
db.transactions.find(
  { user_id: 48 },
  { type: 1, amount: 1, status: 1, created_at: 1 }
).sort({ created_at: -1 }).limit(10);
```

### Get User's Betting History
```javascript
db.bets.find(
  { user_id: 48 },
  { game_id: 1, bet_amount: 1, win_amount: 1, outcome: 1, placed_at: 1 }
).sort({ placed_at: -1 });
```

### Get User's Category Balances
```javascript
db.user_category_balances.find({ user_id: 48 });
```

### Get Transactions by Game
```javascript
db.transactions.find({
  "metadata.game_id": 34,
  type: "bet"
}).sort({ created_at: -1 });
```

### Get Pending Bets
```javascript
db.bets.find({ outcome: "pending" });
```

## Migration from PostgreSQL

When migrating data from PostgreSQL to MongoDB:

1. **Transactions**: Copy all fields, convert `id` to `_id` (ObjectId)
2. **Bets**: Copy all fields, convert `id` to `_id` (ObjectId), convert `transaction_id` to ObjectId
3. **User Category Balances**: Copy all fields, add `_id` (ObjectId)

## Benefits of MongoDB Collections

1. **Flexible Schema**: Easy to add new fields without migrations
2. **JSON Native**: Better handling of metadata and game_data
3. **Horizontal Scaling**: Can be sharded for high-volume applications
4. **Aggregation Pipeline**: Powerful analytics capabilities
5. **Document-Oriented**: Natural fit for complex nested data

## Next Steps

1. **Application Integration**: Modify the application code to use MongoDB collections
2. **Data Migration**: Create scripts to migrate existing PostgreSQL data
3. **Testing**: Verify all operations work correctly with MongoDB
4. **Performance Optimization**: Monitor and optimize queries as needed
5. **Backup Strategy**: Implement MongoDB backup and recovery procedures 