/**
 * Script to run the sync API and deactivate disabled games
 * This will sync all active providers and clean up disabled games
 */

const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: '194.102.33.209',
  user: 'postgres',
  password: '12358Voot#',
  database: 'jackpotx-db',
  port: 5432
});

async function runSync() {
  try {
    console.log('=== Starting Provider Sync ===\n');
    console.log('This will:');
    console.log('1. Fetch games from all active providers');
    console.log('2. Import/update games in database');
    console.log('3. Deactivate games no longer in provider response\n');

    // Get all active providers
    console.log('Fetching active providers...');
    const providersResult = await pool.query(`
      SELECT provider_name, base_url, api_key, api_secret
      FROM game_provider_configs
      WHERE is_active = true
      ORDER BY provider_name
    `);

    if (providersResult.rows.length === 0) {
      console.log('❌ No active providers found!');
      console.log('\nCurrent provider configs:');
      const allProviders = await pool.query('SELECT provider_name, is_active FROM game_provider_configs');
      console.table(allProviders.rows);
      return;
    }

    console.log(`Found ${providersResult.rows.length} active provider(s):\n`);
    providersResult.rows.forEach(p => {
      console.log(`  - ${p.provider_name}`);
      console.log(`    URL: ${p.base_url}\n`);
    });

    let totalDeactivated = 0;
    let totalImported = 0;
    let totalUpdated = 0;

    // Sync each provider
    for (const provider of providersResult.rows) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Syncing: ${provider.provider_name}`);
      console.log('='.repeat(60));

      try {
        // Prepare headers based on provider
        const headers = {
          'Content-Type': 'application/json'
        };

        // Add authentication if needed (example for common patterns)
        if (provider.api_key) {
          headers['Authorization'] = `Bearer ${provider.api_key}`;
          // Or some providers use X-API-Key
          headers['X-API-Key'] = provider.api_key;
        }

        console.log(`Fetching games from: ${provider.base_url}`);

        const response = await axios.get(provider.base_url, {
          headers,
          timeout: 60000
        });

        console.log(`✓ Response received (Status: ${response.status})`);

        const games = response.data.games || response.data;

        if (!Array.isArray(games)) {
          console.log(`❌ Invalid response format (not an array)`);
          continue;
        }

        console.log(`✓ Found ${games.length} games in provider response`);

        // Extract game codes
        const gameCodes = games.map(g =>
          String(g.id || g.game_id || g.code || g.game_code)
        );

        // Get provider name from first game or use config name
        const providerName = (games[0]?.vendor) || provider.provider_name;

        console.log(`Using provider name: "${providerName}" for database matching`);

        // Check current active games for this provider
        const currentActiveGames = await pool.query(`
          SELECT COUNT(*) as count
          FROM games
          WHERE provider = $1 AND is_active = true
        `, [providerName]);

        console.log(`Current active games in DB: ${currentActiveGames.rows[0].count}`);

        // Import/update games
        let imported = 0;
        let updated = 0;
        let failed = 0;

        for (const game of games) {
          try {
            const gameCode = String(game.id || game.game_id || game.code || game.game_code);
            const gameName = game.title || game.name || game.game_name;
            const vendor = game.vendor || providerName;
            const category = game.type || game.subtype || game.category || 'slots';

            // Check if exists
            const existing = await pool.query(
              'SELECT id FROM games WHERE game_code = $1',
              [gameCode]
            );

            if (existing.rows.length > 0) {
              // Update
              await pool.query(`
                UPDATE games
                SET name = $1, provider = $2, vendor = $3, category = $4,
                    is_active = true, updated_at = CURRENT_TIMESTAMP
                WHERE game_code = $5
              `, [gameName, vendor, vendor, category, gameCode]);
              updated++;
            } else {
              // Insert
              await pool.query(`
                INSERT INTO games (name, provider, vendor, category, game_code, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `, [gameName, vendor, vendor, category, gameCode]);
              imported++;
            }
          } catch (err) {
            failed++;
            console.error(`  ⚠ Failed to import game: ${err.message}`);
          }
        }

        console.log(`\n✓ Import complete: ${imported} new, ${updated} updated, ${failed} failed`);

        // NOW: Deactivate games not in the response
        console.log(`\nDeactivating games no longer in provider response...`);

        if (gameCodes.length > 0) {
          const placeholders = gameCodes.map((_, i) => `$${i + 2}`).join(', ');

          const deactivateResult = await pool.query(`
            UPDATE games
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE provider = $1
              AND is_active = true
              AND game_code NOT IN (${placeholders})
          `, [providerName, ...gameCodes]);

          const deactivatedCount = deactivateResult.rowCount || 0;
          totalDeactivated += deactivatedCount;

          if (deactivatedCount > 0) {
            console.log(`🔴 Deactivated ${deactivatedCount} games`);

            // Show which games were deactivated
            const deactivatedGames = await pool.query(`
              SELECT game_code, name
              FROM games
              WHERE provider = $1 AND is_active = false AND updated_at > NOW() - INTERVAL '1 minute'
              LIMIT 10
            `, [providerName]);

            console.log('\nRecently deactivated games (sample):');
            deactivatedGames.rows.forEach(g => {
              console.log(`  - ${g.game_code}: ${g.name}`);
            });
            if (deactivatedCount > 10) {
              console.log(`  ... and ${deactivatedCount - 10} more`);
            }
          } else {
            console.log(`✓ No games needed deactivation`);
          }
        }

        totalImported += imported;
        totalUpdated += updated;

        console.log(`\n✅ ${provider.provider_name} sync complete!`);

      } catch (error) {
        console.error(`\n❌ Error syncing ${provider.provider_name}:`);
        console.error(`   ${error.message}`);
        if (error.response) {
          console.error(`   HTTP Status: ${error.response.status}`);
          console.error(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total imported: ${totalImported}`);
    console.log(`Total updated: ${totalUpdated}`);
    console.log(`Total deactivated: ${totalDeactivated}`);
    console.log('='.repeat(60));

    // NEW: Mark last 100 games as "new releases"
    console.log('\n📌 Updating "New Releases" category...');

    // First, unmark all games
    await pool.query(`UPDATE games SET is_new = false`);
    console.log('   Reset all games is_new flag');

    // Then mark the last 100 most recently created/updated games as new
    const newReleasesResult = await pool.query(`
      UPDATE games
      SET is_new = true
      WHERE id IN (
        SELECT id
        FROM games
        WHERE is_active = true
        ORDER BY created_at DESC, updated_at DESC
        LIMIT 100
      )
    `);

    const newReleasesCount = newReleasesResult.rowCount || 0;
    console.log(`   ✓ Marked ${newReleasesCount} games as "New Releases"`);

    // Show some of the new releases
    const sampleNewReleases = await pool.query(`
      SELECT name, provider, created_at
      FROM games
      WHERE is_new = true
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (sampleNewReleases.rows.length > 0) {
      console.log('\n   Sample new releases:');
      sampleNewReleases.rows.forEach(g => {
        console.log(`   - ${g.name} (${g.provider})`);
      });
    }

    // Check game 64032 specifically
    console.log('\n📌 Checking game 64032 (from your error)...');
    const game64032 = await pool.query(`
      SELECT id, name, game_code, provider, is_active
      FROM games
      WHERE game_code = '64032'
    `);

    if (game64032.rows.length > 0) {
      const game = game64032.rows[0];
      console.log(`   Game: ${game.name}`);
      console.log(`   Provider: ${game.provider}`);
      console.log(`   Status: ${game.is_active ? '✓ ACTIVE' : '✗ INACTIVE (FIXED!)'}`);
    } else {
      console.log('   Game not found in database');
    }

    console.log('\n✅ Sync complete!\n');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

runSync();
