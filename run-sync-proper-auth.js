/**
 * Run provider sync with proper authentication
 */

const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const pool = new Pool({
  host: '194.102.33.209',
  user: 'postgres',
  password: '12358Voot#',
  database: 'jackpotx-db',
  port: 5432
});

function getGameListAuthorization(operatorID, secretKey) {
  const hashString = `games${operatorID}${secretKey}`;
  return crypto.createHash('sha1').update(hashString).digest('hex');
}

async function syncThinkCode() {
  try {
    console.log('=== Syncing ThinkCode Provider ===\n');

    const operatorId = 'thinkcode';
    const secretKey = '2aZWQ93V8aT1sKrA';
    const baseUrl = 'https://air.gameprovider.org/api/generic/games/list/all';

    // Build proper auth header
    const xAuth = getGameListAuthorization(operatorId, secretKey);

    console.log('Authentication:');
    console.log(`  Operator ID: ${operatorId}`);
    console.log(`  X-Authorization: ${xAuth}\n`);

    console.log(`Fetching games from: ${baseUrl}...`);

    const response = await axios.get(baseUrl, {
      headers: {
        'X-Authorization': xAuth,
        'X-Operator-Id': operatorId,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log(`✓ Response received (Status: ${response.status})`);

    const games = response.data.games || response.data;

    if (!Array.isArray(games)) {
      console.log('❌ Invalid response format');
      return;
    }

    console.log(`✓ Found ${games.length} games in API response\n`);

    // Group games by vendor
    const byVendor = {};
    games.forEach(g => {
      const vendor = g.vendor || 'unknown';
      byVendor[vendor] = (byVendor[vendor] || 0) + 1;
    });

    console.log('Games by vendor:');
    Object.entries(byVendor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([vendor, count]) => {
        console.log(`  ${vendor}: ${count} games`);
      });

    console.log(`\n=== Importing/Updating Games ===\n`);

    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (const game of games) {
      try {
        const gameCode = String(game.id || game.game_id || game.code);
        const gameName = game.title || game.name || game.game_name;
        const vendor = game.vendor || 'thinkcode_prod';
        const category = game.type || game.subtype || game.category || 'slots';

        const existing = await pool.query(
          'SELECT id FROM games WHERE game_code = $1',
          [gameCode]
        );

        if (existing.rows.length > 0) {
          await pool.query(`
            UPDATE games
            SET name = $1, provider = $2, vendor = $3, category = $4,
                is_active = true, updated_at = CURRENT_TIMESTAMP
            WHERE game_code = $5
          `, [gameName, vendor, vendor, category, gameCode]);
          updated++;
        } else {
          await pool.query(`
            INSERT INTO games (name, provider, vendor, category, game_code, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [gameName, vendor, vendor, category, gameCode]);
          imported++;
        }

        if ((imported + updated) % 500 === 0) {
          console.log(`  Progress: ${imported + updated} games processed...`);
        }
      } catch (err) {
        failed++;
      }
    }

    console.log(`\n✓ Import complete:`);
    console.log(`  New games: ${imported}`);
    console.log(`  Updated games: ${updated}`);
    console.log(`  Failed: ${failed}\n`);

    // Now deactivate games not in response - grouped by vendor
    console.log('=== Deactivating Missing Games ===\n');

    const vendorsInResponse = Object.keys(byVendor);
    let totalDeactivated = 0;

    for (const vendor of vendorsInResponse) {
      const vendorGames = games.filter(g => (g.vendor || 'thinkcode_prod') === vendor);
      const vendorGameCodes = vendorGames.map(g => String(g.id || g.game_id || g.code));

      if (vendorGameCodes.length === 0) continue;

      const placeholders = vendorGameCodes.map((_, i) => `$${i + 2}`).join(', ');

      const deactivateResult = await pool.query(`
        UPDATE games
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE provider = $1
          AND is_active = true
          AND game_code NOT IN (${placeholders})
      `, [vendor, ...vendorGameCodes]);

      const deactivatedCount = deactivateResult.rowCount || 0;

      if (deactivatedCount > 0) {
        console.log(`  🔴 ${vendor}: Deactivated ${deactivatedCount} games`);
        totalDeactivated += deactivatedCount;
      }
    }

    if (totalDeactivated === 0) {
      console.log('  ✓ No games needed deactivation');
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total games in API: ${games.length}`);
    console.log(`New games imported: ${imported}`);
    console.log(`Existing games updated: ${updated}`);
    console.log(`Games deactivated: ${totalDeactivated}`);

    // Check game 64032
    console.log(`\n=== Checking Game 64032 ===`);
    const game64032 = await pool.query(`
      SELECT id, name, game_code, provider, is_active
      FROM games
      WHERE game_code = '64032'
    `);

    if (game64032.rows.length > 0) {
      const g = game64032.rows[0];
      console.log(`Name: ${g.name}`);
      console.log(`Provider: ${g.provider}`);
      console.log(`Status: ${g.is_active ? '✓ ACTIVE' : '✗ INACTIVE (Fixed!)'}`);

      // Check if this game is in the API response
      const inResponse = games.some(game =>
        String(game.id || game.game_id || game.code) === '64032'
      );
      console.log(`In API response: ${inResponse ? 'Yes' : 'No (provider disabled it)'}`);
    } else {
      console.log('Game not found');
    }

    console.log(`\n✅ Sync Complete!\n`);

  } catch (error) {
    console.error('\n❌ Sync failed:');
    console.error(error.message);
    if (error.response) {
      console.error(`HTTP Status: ${error.response.status}`);
      console.error(`Response:`, error.response.data);
    }
  } finally {
    await pool.end();
  }
}

syncThinkCode();
