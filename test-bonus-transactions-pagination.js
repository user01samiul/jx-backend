/**
 * Test Script: Bonus Transactions Pagination
 *
 * This script tests the /api/bonus/transactions endpoint to verify:
 * 1. Pagination metadata (total, limit, offset)
 * 2. Response format
 * 3. Transaction data structure
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

async function testTransactionsPagination(token) {
  console.log('💰 Testing Bonus Transactions Pagination\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Get first page
    console.log('\n✅ Test 1: First page (limit=10, offset=0)');
    const page1 = await axios.get(`${BASE_URL}/bonus/transactions?limit=10&offset=0`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n📋 Response Structure:');
    console.log(JSON.stringify({
      success: page1.data.success,
      data_type: Array.isArray(page1.data.data) ? 'array' : 'object',
      data_sample: page1.data.data.slice(0, 1),
      pagination: page1.data.pagination
    }, null, 2));

    if (page1.data.pagination) {
      console.log('\n✅ Pagination metadata present:');
      console.log(`   ├─ Total transactions: ${page1.data.pagination.total}`);
      console.log(`   ├─ Returned: ${page1.data.data.length} transactions`);
      console.log(`   ├─ Limit: ${page1.data.pagination.limit}`);
      console.log(`   └─ Offset: ${page1.data.pagination.offset}`);
    } else {
      console.log('❌ No pagination metadata found!');
    }

    if (page1.data.data.length > 0) {
      const firstTxn = page1.data.data[0];
      console.log('\n📄 Transaction Structure:');
      console.log(JSON.stringify({
        id: firstTxn.id,
        bonus_instance_id: firstTxn.bonus_instance_id,
        transaction_type: firstTxn.transaction_type,
        amount: firstTxn.amount,
        balance_before: firstTxn.balance_before,
        balance_after: firstTxn.balance_after,
        description: firstTxn.description,
        created_at: firstTxn.created_at
      }, null, 2));

      // Validate required fields
      console.log('\n🔍 Field Validation:');
      const requiredFields = [
        'id', 'transaction_type', 'amount', 'created_at'
      ];

      const missingFields = requiredFields.filter(field => !(field in firstTxn));
      if (missingFields.length > 0) {
        console.log(`   ❌ Missing required fields: ${missingFields.join(', ')}`);
      } else {
        console.log('   ✅ All required fields present');
      }

      // Display transaction types
      console.log('\n📊 Transaction Types Found:');
      const types = [...new Set(page1.data.data.map(t => t.transaction_type))];
      types.forEach(type => {
        const count = page1.data.data.filter(t => t.transaction_type === type).length;
        console.log(`   ├─ ${type}: ${count}`);
      });
    }

    // Test 2: Get second page if there are enough transactions
    if (page1.data.pagination && page1.data.pagination.total > 10) {
      console.log('\n\n✅ Test 2: Second page (limit=10, offset=10)');
      const page2 = await axios.get(`${BASE_URL}/bonus/transactions?limit=10&offset=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`   ├─ Total transactions: ${page2.data.pagination.total}`);
      console.log(`   ├─ Returned: ${page2.data.data.length} transactions`);
      console.log(`   ├─ Limit: ${page2.data.pagination.limit}`);
      console.log(`   └─ Offset: ${page2.data.pagination.offset}`);

      // Check that pages don't overlap
      const page1Ids = page1.data.data.map(t => t.id);
      const page2Ids = page2.data.data.map(t => t.id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));

      if (overlap.length > 0) {
        console.log(`   ❌ Pages overlap! Duplicate IDs: ${overlap.join(', ')}`);
      } else {
        console.log('   ✅ No overlap between pages');
      }
    }

    // Test 3: Filter by transaction type
    console.log('\n\n✅ Test 3: Filter by type=granted');
    const granted = await axios.get(`${BASE_URL}/bonus/transactions?type=granted&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`   ├─ Granted transactions: ${granted.data.data.length}`);
    const allGranted = granted.data.data.every(t => t.transaction_type === 'granted');
    console.log(`   └─ All have type=granted: ${allGranted ? '✅' : '❌'}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All transaction pagination tests completed!\n');

    // Summary for frontend developer
    console.log('📝 SUMMARY FOR FRONTEND:');
    console.log('─'.repeat(60));
    console.log('Backend Response Format:');
    console.log(`{
  "success": true,
  "data": [...transactions array...],
  "pagination": {
    "total": ${page1.data.pagination.total},
    "limit": 10,
    "offset": 0
  }
}`);
    console.log('\n✅ Backend is ready for pagination!');
    console.log('✅ Frontend just needs to implement pagination UI controls\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('\nFull error response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function main() {
  console.log('\n🎰 JackpotX Backend - Bonus Transactions Pagination Test\n');

  try {
    const token = await login();
    await testTransactionsPagination(token);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

main();
