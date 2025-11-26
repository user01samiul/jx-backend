const axios = require('axios');

async function testSearch() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjQxNTkzMTksImV4cCI6MTc2NDI0NTcxOX0.Mry9L_X_t8t8om-hlCVlIyvKyHlBlTMOpmyaSZa4Md4';

  console.log('🔍 Testing improved search with query "1359"...\n');

  try {
    const response = await axios.get('http://localhost:3001/api/games/search', {
      params: { q: '1359', limit: 20 },
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ SUCCESS! Found ${response.data.data.length} game(s):\n`);
    response.data.data.forEach((game, index) => {
      console.log(`${index + 1}. ID: ${game.id}, Code: ${game.game_code}, Name: ${game.name}, Provider: ${game.provider}`);
    });

    console.log('\n📊 Analysis:');
    const exactIdMatch = response.data.data.find(g => g.id === 1359);
    const exactCodeMatch = response.data.data.find(g => g.game_code === '1359');

    if (exactIdMatch) {
      const position = response.data.data.findIndex(g => g.id === 1359) + 1;
      console.log(`✅ Exact ID match (1359) found at position ${position}`);
    }
    if (exactCodeMatch) {
      const position = response.data.data.findIndex(g => g.game_code === '1359') + 1;
      console.log(`✅ Exact code match (1359) found at position ${position}`);
    }

  } catch (error) {
    console.error('❌ FAILED:', error.response?.data || error.message);
  }
}

testSearch();
