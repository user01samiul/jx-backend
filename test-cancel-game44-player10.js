const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for player10 (user_id: 31) on game 44
const testData = {
  user_id: 31,
  game_id: 44,
  round_id: 1349643,
  request_timestamp: Math.floor(Date.now() / 1000)
};

// Generate hash for the request
function generateHash(command, timestamp) {
  const hashString = `${command}${timestamp}${SECRET_KEY}`;
  return crypto.createHash('sha1').update(hashString).digest('hex');
}

// Generate authorization header
function generateAuthHeader(command) {
  const hash = crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
  return `Bearer ${hash}`;
}

// Test balance method to get current balance
async function testBalance() {
  try {
    console.log('\n🔍 **TESTING BALANCE METHOD**');
    
    const balancePayload = {
      command: 'balance',
      data: {
        user_id: testData.user_id.toString(),
        token: '528597282ee9f25466991e0166f2ec02'
      },
      request_timestamp: testData.request_timestamp.toString(),
      hash: generateHash('balance', testData.request_timestamp)
    };

    const balanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balancePayload, {
      headers: { 'X-Authorization': generateAuthHeader('balance') }
    });

    console.log('✅ Balance Response:', JSON.stringify(balanceResponse.data, null, 2));
    return balanceResponse.data.response.data.balance;
  } catch (error) {
    console.error('❌ Balance Error:', error.response?.data || error.message);
    return null;
  }
}

// Test cancel method
async function testCancel(transactionId) {
  try {
    console.log(`\n🔄 **TESTING CANCEL METHOD - Transaction: ${transactionId}**`);
    console.log(`🎮 **Game ID: ${testData.game_id}**`);
    
    const cancelPayload = {
      command: 'cancel',
      data: {
        transaction_id: transactionId,
        user_id: testData.user_id.toString(),
        token: '528597282ee9f25466991e0166f2ec02',
        game_id: testData.game_id,
        round_id: testData.round_id
      },
      request_timestamp: testData.request_timestamp.toString(),
      hash: generateHash('cancel', testData.request_timestamp)
    };

    const cancelResponse = await axios.post(`${BASE_URL}/innova/cancel`, cancelPayload, {
      headers: { 'X-Authorization': generateAuthHeader('cancel') }
    });

    console.log('✅ Cancel Response:', JSON.stringify(cancelResponse.data, null, 2));
    
    if (cancelResponse.data.response.status === 'OK') {
      return cancelResponse.data.response.data.balance;
    } else {
      console.log(`❌ Cancel failed: ${cancelResponse.data.response.data.error_message}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Cancel Error:', error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🎯 **CANCEL GAME 44 - PLAYER10 TEST**');
  console.log('=====================================');
  
  // Test 1: Get initial balance
  console.log('\n📊 **STEP 1: Get Initial Balance**');
  const initialBalance = await testBalance();
  if (!initialBalance) {
    console.log('❌ Cannot proceed without balance');
    return;
  }
  
  console.log(`💰 Initial Balance: $${initialBalance}`);
  console.log(`🎮 Game ID: ${testData.game_id}`);
  console.log(`👤 Player: player10 (ID: ${testData.user_id})`);
  
  // Test 2: Try to cancel a recent transaction
  console.log('\n📊 **STEP 2: Test Cancel Operation**');
  
  // Try with a recent transaction ID - you can replace this with the actual transaction ID from your game
  const transactionToCancel = '2235000'; // Replace with actual transaction ID from game 44
  console.log(`🔄 Attempting to cancel transaction: ${transactionToCancel}`);
  
  const cancelBalance = await testCancel(transactionToCancel);
  
  if (cancelBalance !== null) {
    console.log(`💰 Cancel Response Balance: $${cancelBalance}`);
    
    // Test 3: Verify balance consistency
    console.log('\n📊 **STEP 3: Verify Balance Consistency**');
    const finalBalance = await testBalance();
    
    if (finalBalance !== null) {
      console.log(`💰 Final Balance: $${finalBalance}`);
      
      // Check if balances are consistent
      if (Math.abs(cancelBalance - finalBalance) < 0.01) {
        console.log('✅ BALANCE CONSISTENCY: PASSED');
        console.log('✅ Cancel and Balance methods return the same value');
      } else {
        console.log('❌ BALANCE CONSISTENCY: FAILED');
        console.log(`❌ Cancel: $${cancelBalance}, Balance: $${finalBalance}`);
      }
    }
  } else {
    console.log('❌ Cancel operation failed - transaction may not exist or already be cancelled');
    console.log('💡 **Note**: You may need to provide the actual transaction ID from your current game session');
  }
  
  console.log('\n🎯 **TEST COMPLETED**');
  console.log('💡 **Next Steps**:');
  console.log('1. If you have a specific transaction ID from game 44, replace "2235000" with it');
  console.log('2. Run the test again with the correct transaction ID');
  console.log('3. The cancel functionality will work correctly once the right transaction is provided');
}

// Run the tests
runTests().catch(console.error); 