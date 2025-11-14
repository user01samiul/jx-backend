const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for player10 (user_id: 31)
const testData = {
  user_id: 31,
  game_id: 18,
  round_id: 1349610,
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
        token: 'test_token_' + testData.user_id
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
    
    const cancelPayload = {
      command: 'cancel',
      data: {
        transaction_id: transactionId,
        user_id: testData.user_id.toString(),
        token: 'test_token_' + testData.user_id
      },
      request_timestamp: testData.request_timestamp.toString(),
      hash: generateHash('cancel', testData.request_timestamp)
    };

    const cancelResponse = await axios.post(`${BASE_URL}/innova/cancel`, cancelPayload, {
      headers: { 'X-Authorization': generateAuthHeader('cancel') }
    });

    console.log('✅ Cancel Response:', JSON.stringify(cancelResponse.data, null, 2));
    return cancelResponse.data.response.data.balance;
  } catch (error) {
    console.error('❌ Cancel Error:', error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🎯 **PLAYER10 CANCEL FUNCTIONALITY TEST**');
  console.log('==========================================');
  
  // Test 1: Get initial balance
  const initialBalance = await testBalance();
  if (!initialBalance) {
    console.log('❌ Cannot proceed without balance');
    return;
  }
  
  console.log(`\n💰 Initial Balance: $${initialBalance}`);
  
  // Test 2: Cancel a bet transaction (ID 1836 - bet of $0.10)
  console.log('\n🎲 **TESTING BET CANCELLATION**');
  const betCancelBalance = await testCancel('1836');
  
  if (betCancelBalance) {
    const betAdjustment = betCancelBalance - initialBalance;
    console.log(`💰 Balance after bet cancellation: $${betCancelBalance}`);
    console.log(`📊 Bet adjustment: $${betAdjustment} (should be +$0.10)`);
  }
  
  // Test 3: Cancel a win transaction (ID 1837 - win of $0.15)
  console.log('\n🎉 **TESTING WIN CANCELLATION**');
  const winCancelBalance = await testCancel('1837');
  
  if (winCancelBalance) {
    const winAdjustment = winCancelBalance - (betCancelBalance || initialBalance);
    console.log(`💰 Balance after win cancellation: $${winCancelBalance}`);
    console.log(`📊 Win adjustment: $${winAdjustment} (should be -$0.15)`);
  }
  
  // Test 4: Get final balance
  console.log('\n🔍 **FINAL BALANCE CHECK**');
  const finalBalance = await testBalance();
  console.log(`💰 Final Balance: $${finalBalance}`);
  
  // Test 5: Check balance consistency
  console.log('\n✅ **BALANCE CONSISTENCY CHECK**');
  if (finalBalance === winCancelBalance) {
    console.log('✅ Balance consistency: PASSED');
  } else {
    console.log('❌ Balance consistency: FAILED');
  }
  
  console.log('\n🎯 **TEST COMPLETED**');
}

// Run the tests
runTests().catch(console.error); 