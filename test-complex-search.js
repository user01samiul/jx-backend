const axios = require('axios');

async function testSearches() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjQxNTkzMTksImV4cCI6MTc2NDI0NTcxOX0.Mry9L_X_t8t8om-hlCVlIyvKyHlBlTMOpmyaSZa4Md4';

  const testCases = [
    { query: '26', description: 'Simple number search' },
    { query: 'Wishing', description: 'Simple text search' },
    { query: '26 - Wishing Well (Vimplay)', description: 'Complex formatted string (the bug)' },
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.description}`);
    console.log(`   Query: "${testCase.query}"`);

    try {
      const response = await axios.get('http://localhost:3001/api/games/search', {
        params: { q: testCase.query, limit: 20 },
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log(`   ✅ SUCCESS! Found ${response.data.data.length} game(s)`);
      if (response.data.data.length > 0) {
        const first = response.data.data[0];
        console.log(`   First result: ID ${first.id} - ${first.game_code} - ${first.name}`);
      }
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.response?.data?.message || error.message}`);
    }
  }

  console.log('\n✅ All tests completed!');
}

testSearches();
