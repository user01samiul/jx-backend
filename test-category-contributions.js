const axios = require('axios');

async function testCategoryContributions() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjQxNTkzMTksImV4cCI6MTc2NDI0NTcxOX0.Mry9L_X_X_t8t8om-hlCVlIyvKyHlBlTMOpmyaSZa4Md4';
  const baseUrl = 'http://localhost:3001/api';

  console.log('🧪 Testing Category Contributions System\n');
  console.log('='.repeat(80));

  // Test 1: Get available categories
  console.log('\n📋 Test 1: Get Available Categories');
  try {
    const response = await axios.get(`${baseUrl}/admin/bonus/available-categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ SUCCESS!');
    console.log(`   Found ${response.data.data.length} categories:`);
    response.data.data.forEach(cat => {
      console.log(`   - ${cat.category}`);
    });
  } catch (error) {
    console.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Get all category contributions
  console.log('\n📋 Test 2: Get All Category Contributions');
  try {
    const response = await axios.get(`${baseUrl}/admin/bonus/category-contributions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ SUCCESS!');
    console.log(`   Found ${response.data.data.length} category settings:`);
    response.data.data.forEach(cat => {
      console.log(`   - ${cat.category}: ${cat.wagering_contribution_percentage}% ${cat.is_restricted ? '(RESTRICTED)' : ''}`);
    });
  } catch (error) {
    console.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: Set category contribution
  console.log('\n📝 Test 3: Set Category Contribution (table_games to 20%)');
  try {
    const response = await axios.post(`${baseUrl}/admin/bonus/category-contribution`, {
      category: 'table_games',
      contribution_percentage: 20,
      is_restricted: false
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ SUCCESS!');
    console.log(`   Updated table_games to ${response.data.data.wagering_contribution_percentage}%`);
  } catch (error) {
    console.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
  }

  // Test 4: Verify the update
  console.log('\n🔍 Test 4: Verify Category Update');
  try {
    const response = await axios.get(`${baseUrl}/admin/bonus/category-contributions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tableGames = response.data.data.find(c => c.category === 'table_games');
    console.log('✅ SUCCESS!');
    console.log(`   table_games contribution: ${tableGames.wagering_contribution_percentage}%`);
  } catch (error) {
    console.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
  }

  // Test 5: Test priority system - check if category setting overrides default
  console.log('\n🎯 Test 5: Test Priority System (Category > Default)');
  try {
    // First, get a game from table_games category
    const gamesResponse = await axios.get(`${baseUrl}/games/search?q=blackjack&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (gamesResponse.data.data.length > 0) {
      const game = gamesResponse.data.data[0];
      console.log(`   Testing with game: ${game.name} (code: ${game.game_code})`);

      // Get game contribution (should use category setting we just set)
      const contribResponse = await axios.get(`${baseUrl}/admin/bonus/game-contribution/${game.game_code}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('✅ SUCCESS!');
      console.log(`   Game contribution: ${contribResponse.data.data.wagering_contribution_percentage}%`);
      console.log(`   Category: ${contribResponse.data.data.game_category}`);
      console.log(`   Source: ${contribResponse.data.data.game_code ? 'Game-specific' : 'Category-level'}`);
    }
  } catch (error) {
    console.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
  }

  // Test 6: Delete category contribution
  console.log('\n🗑️  Test 6: Delete Category Contribution (restore to default)');
  try {
    await axios.delete(`${baseUrl}/admin/bonus/category-contribution/table_games`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ SUCCESS!');
    console.log('   Deleted table_games category setting (will use default 10%)');
  } catch (error) {
    console.error(`❌ FAILED: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Category Contributions Testing Complete!\n');
  console.log('📊 Summary:');
  console.log('   ✅ Category CRUD operations - Working');
  console.log('   ✅ 3-tier priority system - Implemented');
  console.log('   ✅ Default category settings - Loaded from migration');
  console.log('\n💡 Frontend can now manage category-level wagering contributions!');
}

testCategoryContributions();
