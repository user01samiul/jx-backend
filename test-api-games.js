const axios = require('axios');

async function testGamesAPI() {
  try {
    console.log('Testing /api/games endpoint...\n');

    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NTM0NDAyOCwiZXhwIjoxNzU1NDMwNDI4fQ.PyM02n6U3z5w5Nqe5DzFKka7wS4Rvy5KSbS-s857JH4';

    // Test 1: With limit=500
    console.log('Test 1: Requesting limit=500');
    const response1 = await axios.get('http://localhost:3004/api/games?limit=500', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✓ Returned ${response1.data.data.length} games`);
    console.log(`  First game: ${response1.data.data[0].name}`);
    console.log(`  Last game: ${response1.data.data[response1.data.data.length - 1].name}\n`);

    // Test 2: With category filter
    console.log('Test 2: Filter by category=slots');
    const response2 = await axios.get('http://localhost:3004/api/games?category=slots&limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✓ Returned ${response2.data.data.length} games`);
    console.log(`  All games category: ${response2.data.data.every(g => g.category === 'slots') ? 'slots ✓' : 'MIXED ✗'}\n`);

    // Test 3: With provider filter
    console.log('Test 3: Filter by provider=play-son');
    const response3 = await axios.get('http://localhost:3004/api/games?provider=play-son&limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✓ Returned ${response3.data.data.length} games`);
    console.log(`  All games provider: ${response3.data.data.every(g => g.provider === 'play-son') ? 'play-son ✓' : 'MIXED ✗'}\n`);

    // Test 4: Check if game 64032 is in results
    console.log('Test 4: Check if game 64032 (disabled by provider) is in results');
    const game64032 = response1.data.data.find(g => g.game_code === '64032');
    if (game64032) {
      console.log(`✗ Game 64032 FOUND (should be disabled):`);
      console.log(`  Name: ${game64032.name}`);
      console.log(`  Provider: ${game64032.provider}`);
      console.log(`  is_active: ${game64032.is_active}`);
    } else {
      console.log(`✓ Game 64032 NOT FOUND (correctly filtered)`);
    }
    console.log();

    // Test 5: Check if game 56810 is in results
    console.log('Test 5: Check if game 56810 (disabled by provider) is in results');
    const game56810 = response1.data.data.find(g => g.game_code === '56810');
    if (game56810) {
      console.log(`✗ Game 56810 FOUND (should be disabled):`);
      console.log(`  Name: ${game56810.name}`);
      console.log(`  Provider: ${game56810.provider}`);
      console.log(`  is_active: ${game56810.is_active}`);
    } else {
      console.log(`✓ Game 56810 NOT FOUND (correctly filtered)`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testGamesAPI();
