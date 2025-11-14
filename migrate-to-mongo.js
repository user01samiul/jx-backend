const { MongoMigrationService } = require('./dist/services/mongo/mongo-migration.service');
const { MongoHybridService } = require('./dist/services/mongo/mongo-hybrid.service');

async function runMigration() {
  try {
    console.log('🚀 Starting PostgreSQL to MongoDB migration...');
    
    // Initialize MongoDB service
    await MongoHybridService.initialize();
    console.log('✅ MongoDB service initialized');
    
    // Migrate existing data
    await MongoMigrationService.migrateExistingData();
    console.log('✅ Data migration completed');
    
    // Update sequences
    await MongoMigrationService.updateSequences();
    console.log('✅ Sequences updated');
    
    // Verify migration
    await MongoMigrationService.verifyMigration();
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
  }
}

// Run migration
runMigration(); 