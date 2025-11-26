const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'jackpotx-db',
  user: 'postgres',
  password: '12358Voot#'
});

async function testGameContributionAPI() {
  try {
    // Use provided admin access token
    console.log('🔍 Using provided admin access token...');
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjQxNTkzMTksImV4cCI6MTc2NDI0NTcxOX0.Mry9L_X_t8t8om-hlCVlIyvKyHlBlTMOpmyaSZa4Md4';
    console.log('✅ Access token ready');

    // Test 1: Set game contribution with game_id as number
    console.log('\n📝 Test 1: Setting game contribution with game_id as NUMBER (13590)...');
    try {
      const response1 = await axios.post(
        'http://localhost:3001/api/admin/bonus/game-contribution',
        {
          game_id: 13590,
          contribution_percentage: 100,
          is_restricted: false
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Test 1 PASSED:', response1.data);
    } catch (error) {
      console.error('❌ Test 1 FAILED:', error.response?.data || error.message);
    }

    // Test 2: Set game contribution with game_id as string (should now work with coercion)
    console.log('\n📝 Test 2: Setting game contribution with game_id as STRING ("13590")...');
    try {
      const response2 = await axios.post(
        'http://localhost:3001/api/admin/bonus/game-contribution',
        {
          game_id: "13590",
          contribution_percentage: 50,
          is_restricted: false
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Test 2 PASSED:', response2.data);
    } catch (error) {
      console.error('❌ Test 2 FAILED:', error.response?.data || error.message);
    }

    // Verify the game contribution was set
    console.log('\n🔍 Verifying game contribution in database...');
    const verifyResult = await pool.query(
      'SELECT * FROM game_contributions WHERE game_id = $1',
      [13590]
    );

    if (verifyResult.rows.length > 0) {
      console.log('✅ Game contribution found in database:');
      console.log(JSON.stringify(verifyResult.rows[0], null, 2));
    } else {
      console.log('⚠️  No game contribution found in database');
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testGameContributionAPI();
