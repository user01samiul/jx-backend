const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for player10 (user_id: 31)
const testData = {
  user_id: 31,
  game_id: 2,
  round_id: 5378590,
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

    return balanceResponse.data.response.data.balance;
  } catch (error) {
    console.error('❌ Balance Error:', error.response?.data || error.message);
    return null;
  }
}

// Test bet method
async function testBet(transactionId, amount) {
  try {
    const betPayload = {
      command: 'changebalance',
      data: {
        user_id: testData.user_id.toString(),
        token: '528597282ee9f25466991e0166f2ec02',
        transaction_id: transactionId,
        transaction_type: 'BET',
        amount: amount.toString(),
        round_id: testData.round_id,
        round_finished: false,
        game_id: testData.game_id
      },
      request_timestamp: testData.request_timestamp.toString(),
      hash: generateHash('changebalance', testData.request_timestamp)
    };

    const betResponse = await axios.post(`${BASE_URL}/innova/changebalance`, betPayload, {
      headers: { 'X-Authorization': generateAuthHeader('changebalance') }
    });

    return betResponse.data.response.data.balance;
  } catch (error) {
    console.error('❌ Bet Error:', error.response?.data || error.message);
    return null;
  }
}

// Test cancel method
async function testCancel(transactionId) {
  try {
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

    return cancelResponse.data.response.data.balance;
  } catch (error) {
    console.error('❌ Cancel Error:', error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runIsolatedTest() {
  console.log('🎯 **ISOLATED CANCEL TEST**');
  console.log('===========================');
  
  // Generate fresh transaction ID
  const freshTransactionId = Math.floor(Math.random() * 9000000) + 1000000;
  const freshRoundId = Math.floor(Math.random() * 9000000) + 1000000;
  
  console.log(`📝 Fresh Transaction ID: ${freshTransactionId}`);
  console.log(`📝 Fresh Round ID: ${freshRoundId}`);
  
  // Update test data with fresh IDs
  testData.round_id = freshRoundId;
  testData.request_timestamp = Math.floor(Date.now() / 1000);
  
  // Step 1: Get initial balance
  console.log('\n📊 **STEP 1: Get Initial Balance**');
  const initialBalance = await testBalance();
  if (!initialBalance) {
    console.log('❌ Cannot proceed without balance');
    return;
  }
  console.log(`💰 Initial Balance: $${initialBalance}`);
  
  // Step 2: Place a small bet
  console.log('\n📊 **STEP 2: Place Small Bet**');
  const betAmount = 0.10; // Very small bet
  const betBalance = await testBet(freshTransactionId, betAmount);
  if (!betBalance) {
    console.log('❌ Bet failed');
    return;
  }
  console.log(`💰 After Bet Balance: $${betBalance}`);
  console.log(`💰 Expected: $${(initialBalance - betAmount).toFixed(2)}`);
  
  // Step 3: Immediately cancel the bet
  console.log('\n📊 **STEP 3: Immediately Cancel Bet**');
  const cancelBalance = await testCancel(freshTransactionId);
  if (!cancelBalance) {
    console.log('❌ Cancel failed');
    return;
  }
  console.log(`💰 Cancel Response Balance: $${cancelBalance}`);
  console.log(`💰 Expected: $${initialBalance.toFixed(2)}`);
  
  // Step 4: Immediately check balance again
  console.log('\n📊 **STEP 4: Immediate Balance Check**');
  testData.request_timestamp = Math.floor(Date.now() / 1000);
  const finalBalance = await testBalance();
  if (!finalBalance) {
    console.log('❌ Final balance check failed');
    return;
  }
  console.log(`💰 Final Balance: $${finalBalance}`);
  
  // Analysis
  console.log('\n📊 **ANALYSIS**');
  console.log('==============');
  
  const betDifference = Math.abs(initialBalance - betBalance);
  const cancelDifference = Math.abs(cancelBalance - initialBalance);
  const finalDifference = Math.abs(finalBalance - initialBalance);
  
  console.log(`💰 Bet Difference: $${betDifference.toFixed(2)} (Expected: $${betAmount.toFixed(2)})`);
  console.log(`💰 Cancel Difference: $${cancelDifference.toFixed(2)} (Expected: $0.00)`);
  console.log(`💰 Final Difference: $${finalDifference.toFixed(2)} (Expected: $0.00)`);
  
  // Check if cancel worked correctly
  if (cancelDifference < 0.01) {
    console.log('✅ CANCEL OPERATION: PASSED - Balance restored correctly');
  } else {
    console.log('❌ CANCEL OPERATION: FAILED - Balance not restored correctly');
  }
  
  // Check if final balance is consistent
  if (finalDifference < 0.01) {
    console.log('✅ FINAL BALANCE: PASSED - Consistent with initial balance');
  } else {
    console.log('❌ FINAL BALANCE: FAILED - Inconsistent with initial balance');
    console.log(`❌ Balance changed by: $${(finalBalance - initialBalance).toFixed(2)}`);
  }
  
  // Check if cancel and final balance match
  if (Math.abs(cancelBalance - finalBalance) < 0.01) {
    console.log('✅ BALANCE CONSISTENCY: PASSED - Cancel and final balance match');
  } else {
    console.log('❌ BALANCE CONSISTENCY: FAILED - Cancel and final balance differ');
    console.log(`❌ Cancel: $${cancelBalance}, Final: $${finalBalance}`);
  }
  
  console.log('\n🎯 **TEST COMPLETED**');
}

// Run the test
runIsolatedTest().catch(console.error); 