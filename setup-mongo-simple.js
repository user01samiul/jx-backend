// Simple MongoDB Collections Setup Script
// This script creates collections that mirror PostgreSQL tables

// Connect to the database
use jackpotx-db;

// 1. Create transactions collection
db.createCollection("transactions");

// Create indexes for transactions collection
db.transactions.createIndex({ "user_id": 1 });
db.transactions.createIndex({ "created_at": 1 });
db.transactions.createIndex({ "external_reference": 1 });
db.transactions.createIndex({ "status": 1 });
db.transactions.createIndex({ "type": 1 });
db.transactions.createIndex({ "user_id": 1, "external_reference": 1 });
db.transactions.createIndex({ "user_id": 1, "type": 1, "status": 1 });
db.transactions.createIndex({ "user_id": 1, "type": 1, "amount": 1, "created_at": 1 });
db.transactions.createIndex({ "metadata.game_id": 1 });
db.transactions.createIndex({ "metadata.session_id": 1 });

// 2. Create bets collection
db.createCollection("bets");

// Create indexes for bets collection
db.bets.createIndex({ "user_id": 1 });
db.bets.createIndex({ "game_id": 1 });
db.bets.createIndex({ "outcome": 1 });
db.bets.createIndex({ "placed_at": 1 });
db.bets.createIndex({ "user_id": 1, "outcome": 1 });
db.bets.createIndex({ "transaction_id": 1 });

// 3. Create user_category_balances collection
db.createCollection("user_category_balances");

// Create indexes for user_category_balances collection
db.user_category_balances.createIndex({ "user_id": 1, "category": 1 }, { unique: true });
db.user_category_balances.createIndex({ "user_id": 1 });

// 4. Create a sequence collection for auto-incrementing IDs
db.createCollection("sequences");

// Insert initial sequence documents
db.sequences.insertMany([
  { _id: "transaction_id", current_value: 0 },
  { _id: "bet_id", current_value: 0 }
]);

// 5. Insert sample data to test the collections
// Sample transaction
db.transactions.insertOne({
  user_id: 48,
  type: "bet",
  amount: 1.00,
  balance_before: 50.34,
  balance_after: 49.34,
  currency: "USD",
  external_reference: "2247451",
  status: "completed",
  description: "Test bet transaction",
  metadata: {
    game_id: 34,
    category: "slots",
    round_id: 1356140,
    session_id: "test_session_1"
  },
  created_at: new Date(),
  created_by: 1
});

// Sample bet
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

// Sample category balance
db.user_category_balances.insertOne({
  user_id: 48,
  category: "slots",
  balance: 49.34
});

print("MongoDB collections created successfully!");
print("Collections created:");
print("- transactions");
print("- bets"); 
print("- user_category_balances");
print("- sequences");
print("");
print("Indexes created for optimal query performance");
print("Sample data inserted for testing"); 