const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'jackpotx',
  user: 'postgres',
  password: 'postgres'
});

async function disableGame44() {
  try {
    console.log('🔧 Disabling Game 44 for testing...');
    
    // First, check the current status
    const checkResult = await pool.query(
      'SELECT id, name, is_active FROM games WHERE id = 44'
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Game 44 not found in database');
      return false;
    }
    
    const game = checkResult.rows[0];
    console.log(`📋 Current status: Game ${game.id} (${game.name}) - is_active: ${game.is_active}`);
    
    if (!game.is_active) {
      console.log('✅ Game 44 is already disabled');
      return true;
    }
    
    // Disable the game
    const updateResult = await pool.query(
      'UPDATE games SET is_active = false WHERE id = 44 RETURNING id, name, is_active'
    );
    
    if (updateResult.rows.length > 0) {
      const updatedGame = updateResult.rows[0];
      console.log(`✅ Successfully disabled Game ${updatedGame.id} (${updatedGame.name}) - is_active: ${updatedGame.is_active}`);
      return true;
    } else {
      console.log('❌ Failed to disable Game 44');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error disabling Game 44:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the script
disableGame44()
  .then(success => {
    console.log('\n🏁 Operation completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Script failed with error:', error);
    process.exit(1);
  }); 