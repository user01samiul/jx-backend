const axios = require('axios');

async function testGamesSearch() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjQxNTkzMTksImV4cCI6MTc2NDI0NTcxOX0.Mry9L_X_t8t8om-hlCVlIyvKyHlBlTMOpmyaSZa4Md4';

  console.log('🔍 Testing search by game name "Wishing"...\n');
  try {
    const response = await axios.get('http://localhost:3001/api/games/search', {
      params: { q: 'Wishing', limit: 20 },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ SUCCESS!');
    console.log(`Found ${response.data.data.length} game(s):`);
    response.data.data.forEach(game => {
      console.log(`   - ID: ${game.id}, Code: ${game.game_code}, Name: ${game.name}, Provider: ${game.provider}`);
    });
  } catch (error) {
    console.error('❌ FAILED:', error.response?.data || error.message);
  }
}

testGamesSearch();
