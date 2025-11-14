// MongoDB Initialization Script
// This script runs when the MongoDB container starts for the first time

// Switch to admin database
db = db.getSiblingDB('admin');

// Create the jackpotx-db database and user
db = db.getSiblingDB('jackpotx-db');

// Create a user for the jackpotx-db database
db.createUser({
  user: 'admin',
  pwd: 'jackpotxPassword_145225',
  roles: [
    {
      role: 'readWrite',
      db: 'jackpotx-db'
    },
    {
      role: 'dbAdmin',
      db: 'jackpotx-db'
    }
  ]
});

// Create the collections mentioned in MONGODB_SETUP.md
db.createCollection('transactions');
db.createCollection('bets');
db.createCollection('user_category_balances');
db.createCollection('sequences');

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

// Create indexes for bets collection
db.bets.createIndex({ "user_id": 1 });
db.bets.createIndex({ "game_id": 1 });
db.bets.createIndex({ "outcome": 1 });
db.bets.createIndex({ "placed_at": 1 });
db.bets.createIndex({ "user_id": 1, "outcome": 1 });
db.bets.createIndex({ "transaction_id": 1 });

// Create indexes for user_category_balances collection
db.user_category_balances.createIndex({ "user_id": 1, "category": 1 }, { unique: true });
db.user_category_balances.createIndex({ "user_id": 1 });

// Insert initial sequences
db.sequences.insertMany([
  { _id: "transaction_id", current_value: 0 },
  { _id: "bet_id", current_value: 0 }
]);

print('MongoDB initialization completed successfully!');
print('Database: jackpotx-db');
print('User: admin');
print('Collections created: transactions, bets, user_category_balances, sequences'); 