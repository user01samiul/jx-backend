const { MongoClient, ObjectId } = require('mongodb');
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  host: 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '12358Voot#',
  database: process.env.DB_NAME || 'jackpotx-db'
});

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGO_URI);

async function runMigration() {
  try {
    console.log('🚀 Starting PostgreSQL to MongoDB migration...');
    
    // Connect to MongoDB
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = mongoClient.db();
    
    // Migrate transactions
    console.log('📊 Migrating transactions...');
    const transactionResult = await pool.query(`
      SELECT id, user_id, type, amount, balance_before, balance_after, 
             currency, reference_id, external_reference, payment_method, 
             status, description, metadata, created_at, created_by
      FROM transactions
      ORDER BY id
    `);
    
    for (const row of transactionResult.rows) {
      const existing = await db.collection('transactions').findOne({ id: row.id });
      if (!existing) {
        await db.collection('transactions').insertOne({
          _id: new ObjectId(),
          id: row.id,
          user_id: row.user_id,
          type: row.type,
          amount: Number(row.amount),
          balance_before: row.balance_before ? Number(row.balance_before) : null,
          balance_after: row.balance_after ? Number(row.balance_after) : null,
          currency: row.currency || 'USD',
          reference_id: row.reference_id,
          external_reference: row.external_reference,
          payment_method: row.payment_method,
          status: row.status || 'completed',
          description: row.description,
          metadata: row.metadata,
          created_at: row.created_at,
          created_by: row.created_by || 1
        });
      }
    }
    console.log(`✅ Migrated ${transactionResult.rows.length} transactions`);
    
    // Migrate bets
    console.log('🎲 Migrating bets...');
    const betResult = await pool.query(`
      SELECT id, user_id, game_id, transaction_id, bet_amount, win_amount, 
             multiplier, outcome, game_data, placed_at, result_at, 
             session_id, created_at, created_by
      FROM bets
      ORDER BY id
    `);
    
    for (const row of betResult.rows) {
      const existing = await db.collection('bets').findOne({ id: row.id });
      if (!existing) {
        await db.collection('bets').insertOne({
          _id: new ObjectId(),
          id: row.id,
          user_id: row.user_id,
          game_id: row.game_id,
          transaction_id: row.transaction_id,
          bet_amount: Number(row.bet_amount),
          win_amount: Number(row.win_amount || 0),
          multiplier: row.multiplier ? Number(row.multiplier) : null,
          outcome: row.outcome || 'pending',
          game_data: row.game_data,
          placed_at: row.placed_at,
          result_at: row.result_at,
          session_id: row.session_id,
          created_at: row.created_at,
          created_by: row.created_by || 1
        });
      }
    }
    console.log(`✅ Migrated ${betResult.rows.length} bets`);
    
    // Migrate user category balances
    console.log('💰 Migrating user category balances...');
    const balanceResult = await pool.query(`
      SELECT user_id, category, balance
      FROM user_category_balances
      ORDER BY user_id, category
    `);
    
    for (const row of balanceResult.rows) {
      const existing = await db.collection('user_category_balances').findOne({ 
        user_id: row.user_id, 
        category: row.category 
      });
      if (!existing) {
        await db.collection('user_category_balances').insertOne({
          _id: new ObjectId(),
          user_id: row.user_id,
          category: row.category,
          balance: Number(row.balance)
        });
      }
    }
    console.log(`✅ Migrated ${balanceResult.rows.length} user category balances`);
    
    // Update sequences
    console.log('🔄 Updating sequences...');
    const maxTransactionResult = await pool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM transactions');
    const maxBetResult = await pool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM bets');
    
    await db.collection('sequences').updateOne(
      { _id: 'transaction_id' },
      { $set: { current_value: maxTransactionResult.rows[0].max_id } },
      { upsert: true }
    );
    
    await db.collection('sequences').updateOne(
      { _id: 'bet_id' },
      { $set: { current_value: maxBetResult.rows[0].max_id } },
      { upsert: true }
    );
    
    console.log(`✅ Updated sequences - transaction_id: ${maxTransactionResult.rows[0].max_id}, bet_id: ${maxBetResult.rows[0].max_id}`);
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    const pgTransactionCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const mongoTransactionCount = await db.collection('transactions').countDocuments();
    
    const pgBetCount = await pool.query('SELECT COUNT(*) as count FROM bets');
    const mongoBetCount = await db.collection('bets').countDocuments();
    
    const pgBalanceCount = await pool.query('SELECT COUNT(*) as count FROM user_category_balances');
    const mongoBalanceCount = await db.collection('user_category_balances').countDocuments();
    
    console.log('📊 Migration verification results:');
    console.log(`  Transactions: PostgreSQL ${pgTransactionCount.rows[0].count} -> MongoDB ${mongoTransactionCount}`);
    console.log(`  Bets: PostgreSQL ${pgBetCount.rows[0].count} -> MongoDB ${mongoBetCount}`);
    console.log(`  User Category Balances: PostgreSQL ${pgBalanceCount.rows[0].count} -> MongoDB ${mongoBalanceCount}`);
    
    if (parseInt(pgTransactionCount.rows[0].count) !== mongoTransactionCount ||
        parseInt(pgBetCount.rows[0].count) !== mongoBetCount ||
        parseInt(pgBalanceCount.rows[0].count) !== mongoBalanceCount) {
      throw new Error('Migration verification failed: record counts do not match');
    }
    
    console.log('✅ Migration verification passed');
    console.log('🎉 Migration completed successfully!');
    console.log('📊 MongoDB is now ready for transactions, bets, and user_category_balances');
    
    // Start interactive task loop
    console.log('\n🔄 Starting interactive task loop...');
    const { exec } = require('child_process');
    exec('python userinput.py', (error, stdout, stderr) => {
      if (error) {
        console.error('Error running userinput.py:', error);
        return;
      }
      console.log('User input:', stdout);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    await mongoClient.close();
  }
}

// Run migration
runMigration(); 