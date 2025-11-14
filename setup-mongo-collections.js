// MongoDB Collections Setup Script
// This script creates collections that mirror PostgreSQL tables

// Connect to the database
use jackpotx-db;

// 1. Create transactions collection
db.createCollection("transactions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["amount"],
      properties: {
        _id: { bsonType: "objectId" },
        user_id: { bsonType: "int" },
        type: { 
          bsonType: "string",
          enum: ["deposit", "withdrawal", "bet", "win", "bonus", "cashback", "refund", "adjustment", "cancellation"]
        },
        amount: { bsonType: "number" },
        balance_before: { bsonType: "number" },
        balance_after: { bsonType: "number" },
        currency: { bsonType: "string", default: "USD" },
        reference_id: { bsonType: "string" },
        external_reference: { bsonType: "string" },
        payment_method: { bsonType: "string" },
        status: { 
          bsonType: "string", 
          enum: ["pending", "completed", "failed", "cancelled"],
          default: "pending"
        },
        description: { bsonType: "string" },
        metadata: { bsonType: "object" },
        created_at: { bsonType: "date", default: new Date() },
        created_by: { bsonType: "int", default: 1 }
      }
    }
  }
});

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
db.createCollection("bets", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["bet_amount"],
      properties: {
        _id: { bsonType: "objectId" },
        user_id: { bsonType: "int" },
        game_id: { bsonType: "int" },
        transaction_id: { bsonType: "objectId" },
        bet_amount: { bsonType: "number" },
        win_amount: { bsonType: "number", default: 0 },
        multiplier: { bsonType: "number" },
        outcome: { 
          bsonType: "string",
          enum: ["win", "lose", "pending", "cancelled"]
        },
        game_data: { bsonType: "object" },
        placed_at: { bsonType: "date", default: new Date() },
        result_at: { bsonType: "date" },
        session_id: { bsonType: "string" },
        created_at: { bsonType: "date", default: new Date() },
        created_by: { bsonType: "int", default: 1 }
      }
    }
  }
});

// Create indexes for bets collection
db.bets.createIndex({ "user_id": 1 });
db.bets.createIndex({ "game_id": 1 });
db.bets.createIndex({ "outcome": 1 });
db.bets.createIndex({ "placed_at": 1 });
db.bets.createIndex({ "user_id": 1, "outcome": 1 });
db.bets.createIndex({ "transaction_id": 1 });

// 3. Create user_category_balances collection
db.createCollection("user_category_balances", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "category", "balance"],
      properties: {
        _id: { bsonType: "objectId" },
        user_id: { bsonType: "int" },
        category: { bsonType: "string" },
        balance: { bsonType: "number", default: 0 }
      }
    }
  }
});

// Create indexes for user_category_balances collection
db.user_category_balances.createIndex({ "user_id": 1, "category": 1 }, { unique: true });
db.user_category_balances.createIndex({ "user_id": 1 });

// 4. Create a sequence collection for auto-incrementing IDs (similar to PostgreSQL sequences)
db.createCollection("sequences");

// Insert initial sequence documents
db.sequences.insertMany([
  { _id: "transaction_id", current_value: 0 },
  { _id: "bet_id", current_value: 0 }
]);

// Create a function to get next sequence value
db.system.js.save({
  _id: "getNextSequence",
  value: function(name) {
    var ret = db.sequences.findAndModify({
      query: { _id: name },
      update: { $inc: { current_value: 1 } },
      new: true
    });
    return ret.current_value;
  }
});

print("MongoDB collections created successfully!");
print("Collections created:");
print("- transactions");
print("- bets"); 
print("- user_category_balances");
print("- sequences");
print("");
print("Indexes created for optimal query performance");
print("Sequence function created for auto-incrementing IDs"); 