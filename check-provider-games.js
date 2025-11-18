const axios = require('axios');
const crypto = require('crypto');

function getGameListAuthorization(operatorID, secretKey) {
  const hashString = `games${operatorID}${secretKey}`;
  return crypto.createHash('sha1').update(hashString).digest('hex');
}

async function checkProviderGames() {
  try {
    console.log('Checking ThinkCode API for specific games...\n');

    const operatorId = 'thinkcode';
    const secretKey = '2aZWQ93V8aT1sKrA';
    const baseUrl = 'https://air.gameprovider.org/api/generic/games/list/all';
    const xAuth = getGameListAuthorization(operatorId, secretKey);

    const response = await axios.get(baseUrl, {
      headers: {
        'X-Authorization': xAuth,
        'X-Operator-Id': operatorId,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const games = response.data.games || response.data;
    console.log(`✓ Fetched ${games.length} games from ThinkCode API\n`);

    // Check if game 64032 is in the response
    const game64032 = games.find(g => String(g.id || g.game_id || g.code) === '64032');
    console.log('Game 64032 (5 Super Sevens & Fruits):');
    if (game64032) {
      console.log(`  ✓ FOUND in API response`);
      console.log(`  Vendor: ${game64032.vendor || 'N/A'}`);
      console.log(`  Name: ${game64032.title || game64032.name}`);
    } else {
      console.log(`  ✗ NOT FOUND in API response (should be deactivated!)`);
    }
    console.log();

    // Check if game 56810 is in the response
    const game56810 = games.find(g => String(g.id || g.game_id || g.code) === '56810');
    console.log('Game 56810 (Andar Bahar):');
    if (game56810) {
      console.log(`  ✓ FOUND in API response`);
      console.log(`  Vendor: ${game56810.vendor || 'N/A'}`);
      console.log(`  Name: ${game56810.title || game56810.name}`);
    } else {
      console.log(`  ✗ NOT FOUND in API response (should be deactivated!)`);
    }
    console.log();

    // Check play-son games count
    const playsonGames = games.filter(g => (g.vendor || '').toLowerCase() === 'play-son');
    console.log(`Play-son games in API: ${playsonGames.length}`);

    // Check iconic21 games count
    const iconic21Games = games.filter(g => (g.vendor || '').toLowerCase() === 'iconic21');
    console.log(`Iconic21 games in API: ${iconic21Games.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkProviderGames();
