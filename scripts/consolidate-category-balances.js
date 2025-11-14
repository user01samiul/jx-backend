/**
 * UNIFIED WALLET - Category Balance Consolidation Script
 *
 * This script consolidates all category balances (MongoDB) into main wallet (PostgreSQL)
 * Preserves all transaction history for RTP/GGR analytics
 */

const { MongoClient } = require('mongodb');
const { Pool } = require('pg');

// Configuration
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGO_DB = process.env.MONGODB_NAME || 'jackpotx';

const PG_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'jackpotx-db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12358Voot#',
};

let mongoClient;
let pgPool;
let stats = {
  usersProcessed: 0,
  totalCategoryBalance: 0,
  totalMainBalance: 0,
  errors: [],
  startTime: Date.now(),
};

async function connect() {
  console.log('🔌 Connecting to databases...');

  // MongoDB
  mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  console.log('✅ MongoDB connected');

  // PostgreSQL
  pgPool = new Pool(PG_CONFIG);
  await pgPool.query('SELECT NOW()');
  console.log('✅ PostgreSQL connected');
}

async function getCategoryBalances() {
  const db = mongoClient.db(MONGO_DB);
  const collection = db.collection('user_category_balances');

  console.log('\n📊 Fetching category balances from MongoDB...');
  const balances = await collection.find({ balance: { $gt: 0 } }).toArray();
  console.log(`Found ${balances.length} non-zero category balances`);

  return balances;
}

async function consolidateBalances(categoryBalances) {
  console.log('\n💰 Consolidating balances...\n');

  // Group by user_id
  const userBalances = {};

  for (const balance of categoryBalances) {
    const userId = balance.user_id;
    if (!userBalances[userId]) {
      userBalances[userId] = {
        categories: {},
        total: 0,
      };
    }

    userBalances[userId].categories[balance.category] = parseFloat(balance.balance);
    userBalances[userId].total += parseFloat(balance.balance);
  }

  console.log(`📈 Processing ${Object.keys(userBalances).length} users...\n`);

  for (const [userId, data] of Object.entries(userBalances)) {
    try {
      const client = await pgPool.connect();

      try {
        await client.query('BEGIN');

        // Get current main balance
        const result = await client.query(
          'SELECT balance FROM user_balances WHERE user_id = $1',
          [userId]
        );

        if (result.rows.length === 0) {
          console.log(`⚠️  User ${userId} not found in user_balances, skipping...`);
          await client.query('ROLLBACK');
          continue;
        }

        const currentBalance = parseFloat(result.rows[0].balance);
        const newBalance = currentBalance + data.total;

        // Update main balance
        await client.query(
          'UPDATE user_balances SET balance = $1, updated_at = NOW() WHERE user_id = $2',
          [newBalance, userId]
        );

        // Create consolidation transaction record
        await client.query(
          `INSERT INTO transactions
           (user_id, type, amount, status, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            userId,
            'adjustment', // Type allowed by constraint
            data.total,
            'completed',
            JSON.stringify({
              categories: data.categories,
              previous_main_balance: currentBalance,
              new_main_balance: newBalance,
              migration_date: new Date().toISOString(),
              migration_type: 'unified_wallet',
            }),
          ]
        );

        await client.query('COMMIT');

        stats.usersProcessed++;
        stats.totalCategoryBalance += data.total;
        stats.totalMainBalance += newBalance;

        console.log(`✅ User ${userId}: $${currentBalance.toFixed(2)} → $${newBalance.toFixed(2)} (+$${data.total.toFixed(2)} from ${Object.keys(data.categories).length} categories)`);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error(`❌ Error processing user ${userId}:`, error.message);
      stats.errors.push({ userId, error: error.message });
    }
  }
}

async function backupCategoryBalances() {
  const db = mongoClient.db(MONGO_DB);
  const collection = db.collection('user_category_balances');
  const backup = db.collection('user_category_balances_backup');

  console.log('\n💾 Creating backup of category balances...');

  // Check if backup already exists
  const existingBackup = await backup.countDocuments();
  if (existingBackup > 0) {
    console.log(`ℹ️  Backup already exists with ${existingBackup} records, skipping...`);
    return;
  }

  const allBalances = await collection.find({}).toArray();

  if (allBalances.length > 0) {
    const backupData = allBalances.map(balance => ({
      ...balance,
      backup_date: new Date(),
      migration_reason: 'unified_wallet',
    }));

    await backup.insertMany(backupData);
    console.log(`✅ Backed up ${backupData.length} category balances to 'user_category_balances_backup'`);
  } else {
    console.log('ℹ️  No category balances to backup');
  }
}

async function clearCategoryBalances() {
  const db = mongoClient.db(MONGO_DB);
  const collection = db.collection('user_category_balances');

  console.log('\n🗑️  Clearing category balances from MongoDB...');

  const result = await collection.deleteMany({});
  console.log(`✅ Deleted ${result.deletedCount} category balance records`);
}

async function printStats() {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('📊 CONSOLIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Users processed: ${stats.usersProcessed}`);
  console.log(`💰 Total category balance consolidated: $${stats.totalCategoryBalance.toFixed(2)}`);
  console.log(`📈 Average balance per user: $${(stats.totalCategoryBalance / stats.usersProcessed || 0).toFixed(2)}`);
  console.log(`⏱️  Duration: ${duration}s`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors: ${stats.errors.length}`);
    stats.errors.forEach(err => {
      console.log(`   User ${err.userId}: ${err.error}`);
    });
  }

  console.log('='.repeat(60) + '\n');
}

async function verifyConsolidation() {
  console.log('\n🔍 Verifying consolidation...');

  const db = mongoClient.db(MONGO_DB);
  const collection = db.collection('user_category_balances');

  const remaining = await collection.countDocuments({ balance: { $gt: 0 } });

  if (remaining === 0) {
    console.log('✅ Verification passed: No remaining category balances');
  } else {
    console.log(`⚠️  Warning: ${remaining} category balances still have non-zero balance`);
  }

  // Check transactions
  const txResult = await pgPool.query(
    "SELECT COUNT(*) as count FROM transactions WHERE type = 'adjustment' AND metadata->>'migration_type' = 'unified_wallet'"
  );

  console.log(`✅ Created ${txResult.rows[0].count} consolidation transaction records`);
}

async function main() {
  console.log('🚀 UNIFIED WALLET - Category Balance Consolidation');
  console.log('='.repeat(60) + '\n');

  try {
    await connect();

    const categoryBalances = await getCategoryBalances();

    if (categoryBalances.length === 0) {
      console.log('ℹ️  No category balances to consolidate. Exiting...');
      return;
    }

    // Backup before consolidation
    await backupCategoryBalances();

    // Consolidate balances
    await consolidateBalances(categoryBalances);

    // Clear category balances
    await clearCategoryBalances();

    // Verify
    await verifyConsolidation();

    // Print stats
    await printStats();

    console.log('✅ Consolidation completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (mongoClient) await mongoClient.close();
    if (pgPool) await pgPool.end();
  }
}

// Run
main().catch(console.error);
