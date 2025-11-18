/**
 * Test script to verify the sync deactivation logic
 * This simulates what happens during a provider sync
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: '194.102.33.209',
  user: 'postgres',
  password: '12358Voot#',
  database: 'jackpotx-db',
  port: 5432
});

async function testDeactivationLogic() {
  try {
    console.log('=== Testing Sync Deactivation Logic ===\n');

    // Step 1: Create a test provider config if it doesn't exist
    const testProviderName = 'test_provider_sync';
    console.log(`1. Setting up test provider: ${testProviderName}`);

    await pool.query(`
      INSERT INTO game_provider_configs (provider_name, base_url, api_key, api_secret, is_active)
      VALUES ($1, 'http://test.example.com/api/games', 'test_key', 'test_secret', false)
      ON CONFLICT (provider_name) DO NOTHING
    `, [testProviderName]);

    // Step 2: Insert some test games
    console.log('2. Inserting test games...');
    const testGames = [
      { code: 'TEST001', name: 'Test Game 1' },
      { code: 'TEST002', name: 'Test Game 2' },
      { code: 'TEST003', name: 'Test Game 3' },
      { code: 'TEST004', name: 'Test Game 4' },
      { code: 'TEST005', name: 'Test Game 5' }
    ];

    for (const game of testGames) {
      await pool.query(`
        INSERT INTO games (name, provider, vendor, category, game_code, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, 'slots', $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (game_code) DO UPDATE SET is_active = true
      `, [game.name, testProviderName, testProviderName, game.code]);
    }

    // Step 3: Check initial state
    const initialCount = await pool.query(`
      SELECT COUNT(*) as count FROM games
      WHERE provider = $1 AND is_active = true
    `, [testProviderName]);
    console.log(`   ✓ Created ${initialCount.rows[0].count} active test games\n`);

    // Step 4: Simulate a sync where provider only returns 3 games (TEST001, TEST002, TEST003)
    console.log('3. Simulating provider sync...');
    console.log('   Provider API returns: TEST001, TEST002, TEST003');
    console.log('   Missing from response: TEST004, TEST005\n');

    const providerResponse = ['TEST001', 'TEST002', 'TEST003'];

    // Step 5: Run the deactivation query (this is what our fix does)
    console.log('4. Running deactivation query...');
    const deactivateResult = await pool.query(`
      UPDATE games
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE provider = $1
        AND is_active = true
        AND game_code NOT IN ($2, $3, $4)
    `, [testProviderName, ...providerResponse]);

    console.log(`   ✓ Deactivated ${deactivateResult.rowCount} games\n`);

    // Step 6: Verify results
    console.log('5. Verifying results...');
    const activeGames = await pool.query(`
      SELECT game_code, name, is_active
      FROM games
      WHERE provider = $1
      ORDER BY game_code
    `, [testProviderName]);

    console.log('\n   Final state:');
    activeGames.rows.forEach(game => {
      const status = game.is_active ? '✓ ACTIVE  ' : '✗ INACTIVE';
      console.log(`   ${status} | ${game.game_code} | ${game.name}`);
    });

    // Step 7: Validate
    const activeCount = activeGames.rows.filter(g => g.is_active).length;
    const inactiveCount = activeGames.rows.filter(g => !g.is_active).length;

    console.log('\n=== Test Results ===');
    console.log(`Active games: ${activeCount} (expected: 3)`);
    console.log(`Inactive games: ${inactiveCount} (expected: 2)`);

    if (activeCount === 3 && inactiveCount === 2) {
      console.log('\n✅ TEST PASSED: Deactivation logic works correctly!\n');
    } else {
      console.log('\n❌ TEST FAILED: Unexpected results!\n');
    }

    // Cleanup
    console.log('6. Cleaning up test data...');
    await pool.query(`DELETE FROM games WHERE provider = $1`, [testProviderName]);
    await pool.query(`DELETE FROM game_provider_configs WHERE provider_name = $1`, [testProviderName]);
    console.log('   ✓ Test data removed\n');

  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testDeactivationLogic();
