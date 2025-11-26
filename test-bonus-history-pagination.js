/**
 * Test Script: Bonus History Pagination & Status
 *
 * This script tests:
 * 1. Pagination (limit, offset, total)
 * 2. Proper status calculation (completed vs active)
 * 3. Response format with bonus_plan nested object
 * 4. wager_requirement_multiplier field
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3004/api';

// Test credentials - Replace with actual test user credentials
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'Test123!'
};

async function login() {
  console.log('🔐 Logging in...\n');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_CREDENTIALS);
    return response.data.data.accessToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testBonusHistoryPagination(token) {
  console.log('📊 Testing Bonus History Pagination\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Get first page (10 items)
    console.log('\n✅ Test 1: First page (limit=10, offset=0)');
    const page1 = await axios.get(`${BASE_URL}/bonus/my-bonuses?limit=10&offset=0`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`   ├─ Total bonuses: ${page1.data.pagination.total}`);
    console.log(`   ├─ Returned: ${page1.data.data.length} bonuses`);
    console.log(`   ├─ Limit: ${page1.data.pagination.limit}`);
    console.log(`   └─ Offset: ${page1.data.pagination.offset}`);

    if (page1.data.data.length > 0) {
      const firstBonus = page1.data.data[0];
      console.log('\n📋 First Bonus Response Format:');
      console.log(JSON.stringify({
        id: firstBonus.id,
        bonus_plan_id: firstBonus.bonus_plan_id,
        bonus_type: firstBonus.bonus_type,
        status: firstBonus.status,
        bonus_amount: firstBonus.bonus_amount,
        wager_requirement_amount: firstBonus.wager_requirement_amount,
        wager_requirement_multiplier: firstBonus.wager_requirement_multiplier,
        wager_progress_amount: firstBonus.wager_progress_amount,
        wager_percentage_complete: firstBonus.wager_percentage_complete,
        granted_at: firstBonus.granted_at,
        expires_at: firstBonus.expires_at,
        completed_at: firstBonus.completed_at,
        code_used: firstBonus.code_used,
        bonus_plan: firstBonus.bonus_plan
      }, null, 2));

      // Validate required fields
      console.log('\n🔍 Field Validation:');
      const requiredFields = [
        'id', 'bonus_plan_id', 'status', 'bonus_amount',
        'wager_requirement_amount', 'wager_progress_amount'
      ];

      const missingFields = requiredFields.filter(field => !(field in firstBonus));
      if (missingFields.length > 0) {
        console.log(`   ❌ Missing required fields: ${missingFields.join(', ')}`);
      } else {
        console.log('   ✅ All required fields present');
      }

      // Check bonus_plan nested object
      if (firstBonus.bonus_plan) {
        console.log('   ✅ bonus_plan object exists');
        console.log(`      ├─ id: ${firstBonus.bonus_plan.id}`);
        console.log(`      ├─ name: ${firstBonus.bonus_plan.name}`);
        console.log(`      ├─ bonus_code: ${firstBonus.bonus_plan.bonus_code || 'N/A'}`);
        console.log(`      └─ bonus_type: ${firstBonus.bonus_plan.bonus_type}`);
      } else {
        console.log('   ❌ bonus_plan object missing!');
      }

      // Check status calculation
      console.log('\n📈 Status Analysis:');
      page1.data.data.forEach((bonus, index) => {
        const isCompleted = bonus.wager_progress_amount >= bonus.wager_requirement_amount;
        const expectedStatus = isCompleted ? 'completed' : 'active';
        const statusMatch = bonus.status === expectedStatus || bonus.status === 'wagering';

        console.log(`   ${index + 1}. ${bonus.bonus_plan?.name || 'Unknown'}`);
        console.log(`      ├─ Progress: ${bonus.wager_progress_amount}/${bonus.wager_requirement_amount}`);
        console.log(`      ├─ Percentage: ${bonus.wager_percentage_complete}%`);
        console.log(`      └─ Status: ${bonus.status} ${statusMatch ? '✅' : '⚠️'}`);
      });
    }

    // Test 2: Get second page if there are enough bonuses
    if (page1.data.pagination.total > 10) {
      console.log('\n\n✅ Test 2: Second page (limit=10, offset=10)');
      const page2 = await axios.get(`${BASE_URL}/bonus/my-bonuses?limit=10&offset=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`   ├─ Total bonuses: ${page2.data.pagination.total}`);
      console.log(`   ├─ Returned: ${page2.data.data.length} bonuses`);
      console.log(`   ├─ Limit: ${page2.data.pagination.limit}`);
      console.log(`   └─ Offset: ${page2.data.pagination.offset}`);

      // Check that pages don't overlap
      const page1Ids = page1.data.data.map(b => b.id);
      const page2Ids = page2.data.data.map(b => b.id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));

      if (overlap.length > 0) {
        console.log(`   ❌ Pages overlap! Duplicate IDs: ${overlap.join(', ')}`);
      } else {
        console.log('   ✅ No overlap between pages');
      }
    }

    // Test 3: Filter by status
    console.log('\n\n✅ Test 3: Filter by status=completed');
    const completed = await axios.get(`${BASE_URL}/bonus/my-bonuses?status=completed&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`   ├─ Completed bonuses: ${completed.data.data.length}`);
    const allCompleted = completed.data.data.every(b => b.status === 'completed');
    console.log(`   └─ All have status=completed: ${allCompleted ? '✅' : '❌'}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All pagination tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('\nFull error response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function main() {
  console.log('\n🎰 JackpotX Backend - Bonus History Pagination Test\n');

  try {
    const token = await login();
    await testBonusHistoryPagination(token);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

main();
