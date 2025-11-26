const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12358Voot#',
  database: 'jackpotx-db',
  max: 10
});

async function testWageringProgressAPI() {
  console.log('🧪 Testing Wagering Progress API Query\n');
  console.log('='.repeat(80));

  const client = await pool.connect();

  try {
    // Test the exact query that getPlayerActiveProgress uses
    const playerId = 56; // Use the player ID we found earlier

    console.log(`\n📊 Testing query for player_id: ${playerId}...\n`);

    const result = await client.query(
      `SELECT wp.* FROM bonus_wager_progress wp
       INNER JOIN bonus_instances bi ON wp.bonus_instance_id = bi.id
       WHERE wp.player_id = $1
       AND bi.status IN ('active', 'wagering')
       AND wp.completed_at IS NULL
       ORDER BY wp.started_at DESC`,
      [playerId]
    );

    console.log(`✅ Query executed successfully!`);
    console.log(`📋 Found ${result.rows.length} active wagering progress record(s)\n`);

    if (result.rows.length > 0) {
      console.log('Wagering Progress Details:');
      console.log('─'.repeat(80));

      result.rows.forEach((row, index) => {
        console.log(`\n[Bonus ${index + 1}] bonus_instance_id: ${row.bonus_instance_id}`);
        console.log(`  Current Wager: $${parseFloat(row.current_wager_amount).toFixed(2)}`);
        console.log(`  Required Wager: $${parseFloat(row.required_wager_amount).toFixed(2)}`);
        console.log(`  Progress: ${parseFloat(row.completion_percentage).toFixed(2)}%`);
        console.log(`  \nContributions by Category:`);
        console.log(`    🎰 Slots: $${parseFloat(row.slots_contribution || 0).toFixed(2)}`);
        console.log(`    🎲 Table Games: $${parseFloat(row.table_games_contribution || 0).toFixed(2)}`);
        console.log(`    👤 Live Casino: $${parseFloat(row.live_casino_contribution || 0).toFixed(2)}`);
        console.log(`    🃏 Video Poker: $${parseFloat(row.video_poker_contribution || 0).toFixed(2)}`);
        console.log(`    🎮 Other Games: $${parseFloat(row.other_games_contribution || 0).toFixed(2)}`);
        console.log(`  Total Bets: ${row.total_bets_count || 0}`);
        console.log(`  Last Bet: ${row.last_bet_at || 'Never'}`);
      });

      console.log('\n' + '─'.repeat(80));
    } else {
      console.log('⚠️  No active wagering progress found for this player.');
      console.log('💡 This could mean:');
      console.log('   - Player has no active bonuses');
      console.log('   - Bonuses are not in "active" or "wagering" status');
      console.log('   - Wagering has already been completed');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ API query test completed successfully!');
    console.log('💡 The /api/bonus/wagering-progress endpoint should now work correctly.\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Detail:', error.detail || 'N/A');
    console.error('Hint:', error.hint || 'N/A');
  } finally {
    client.release();
    await pool.end();
  }
}

testWageringProgressAPI();
