const axios = require('axios');

async function testGamesSearch() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjQxNTkzMTksImV4cCI6MTc2NDI0NTcxOX0.Mry9L_X_t8t8om-hlCVlIyvKyHlBlTMOpmyaSZa4Md4';

  try {
    console.log('🔍 Testing /api/games/search with ID 13590...\n');

    const response = await axios.get('http://localhost:3001/api/games/search', {
      params: {
        q: '13590',
        limit: 20
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ SUCCESS! Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.data && response.data.data.length > 0) {
      console.log('\n✅ Found games:');
      response.data.data.forEach(game => {
        console.log(`   - ID: ${game.id}, Code: ${game.game_code}, Name: ${game.name}, Provider: ${game.provider}`);
      });
    }

  } catch (error) {
    console.error('❌ FAILED!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

testGamesSearch();
