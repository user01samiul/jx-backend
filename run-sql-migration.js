const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'jackpotx',
  user: 'postgres',
  password: 'postgres'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 **RUNNING SQL MIGRATION**');
    console.log('============================');
    
    // Drop the existing constraint if it exists
    console.log('📝 Dropping existing constraint...');
    await client.query('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;');
    
    // Add the updated constraint with transfer type
    console.log('📝 Adding updated constraint with transfer type...');
    await client.query(`
      ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
      CHECK (type::text = ANY (ARRAY[
          'deposit'::text, 
          'withdrawal'::text, 
          'bet'::text, 
          'win'::text, 
          'bonus'::text, 
          'cashback'::text, 
          'refund'::text, 
          'adjustment'::text,
          'cancellation'::text,
          'transfer'::text
      ]));
    `);
    
    // Verify the constraint
    console.log('🔍 Verifying constraint...');
    const constraintResult = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conname = 'transactions_type_check';
    `);
    
    console.log('✅ Constraint definition:');
    console.log(constraintResult.rows[0]);
    
    // Check existing transaction types
    console.log('📊 Checking existing transaction types...');
    const typesResult = await client.query(`
      SELECT DISTINCT type, COUNT(*) as count 
      FROM transactions 
      GROUP BY type 
      ORDER BY type;
    `);
    
    console.log('📋 Current transaction types:');
    typesResult.rows.forEach(row => {
      console.log(`   ${row.type}: ${row.count} transactions`);
    });
    
    console.log('🎉 **MIGRATION COMPLETED SUCCESSFULLY!**');
    console.log('   ✅ Transfer transaction type is now allowed');
    console.log('   ✅ Database constraint updated');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error); 