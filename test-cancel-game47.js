const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for player10 (user_id: 31) - Game 47
const testData = {
  user_id: 31,
  game_id: 47, // Game 47 as specified
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

// Test bet method for Game 47
async function testBet(transactionId, amount) {
  try {
    console.log(`\n🎲 **TESTING BET METHOD - Game 47 - Transaction: ${transactionId}**`);
    
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

    console.log('✅ Bet Response:', JSON.stringify(betResponse.data, null, 2));
    return betResponse.data.response.data.balance;
  } catch (error) {
    console.error('❌ Bet Error:', error.response?.data || error.message);
    return null;
  }
}

// Test cancel method for Game 47
async function testCancel(transactionId) {
  try {
    console.log(`\n🔄 **TESTING CANCEL METHOD - Game 47 - Transaction: ${transactionId}**`);
    
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
    return cancelResponse.data.response.data.balance;
  } catch (error) {
    console.error('❌ Cancel Error:', error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runGame47Test() {
  console.log('🎯 **GAME 47 CANCEL TEST**');
  console.log('==========================');
  console.log('🎮 Testing while user plays at https://jackpotx.net/play/47');
  
  // Generate fresh transaction ID
  const freshTransactionId = Math.floor(Math.random() * 9000000) + 1000000;
  const freshRoundId = Math.floor(Math.random() * 9000000) + 1000000;
  
  console.log(`📝 Fresh Transaction ID: ${freshTransactionId}`);
  console.log(`📝 Fresh Round ID: ${freshRoundId}`);
  console.log(`🎮 Game ID: ${testData.game_id}`);
  
  // Update test data with fresh IDs
  testData.round_id = freshRoundId;
  testData.request_timestamp = Math.floor(Date.now() / 1000);
  
  // Step 1: Get current balance
  console.log('\n📊 **STEP 1: Get Current Balance**');
  const currentBalance = await testBalance();
  if (!currentBalance) {
    console.log('❌ Cannot proceed without balance');
    return;
  }
  
  console.log(`💰 Current Balance: $${currentBalance}`);
  
  // Step 2: Place a small bet on Game 47
  console.log('\n📊 **STEP 2: Place Small Bet on Game 47**');
  const betAmount = 0.25; // Small bet amount
  const betBalance = await testBet(freshTransactionId, betAmount);
  
  if (!betBalance) {
    console.log('❌ Bet failed');
    return;
  }
  
  console.log(`💰 After Bet Balance: $${betBalance}`);
  console.log(`💰 Expected: $${(currentBalance - betAmount).toFixed(2)}`);
  
  // Step 3: Cancel the bet on Game 47
  console.log('\n📊 **STEP 3: Cancel Bet on Game 47**');
  const cancelBalance = await testCancel(freshTransactionId);
  
  if (cancelBalance !== null) {
    console.log(`💰 Cancel Response Balance: $${cancelBalance}`);
    console.log(`💰 Expected: $${currentBalance.toFixed(2)}`);
    
    // Step 4: Verify final balance
    console.log('\n📊 **STEP 4: Verify Final Balance**');
    testData.request_timestamp = Math.floor(Date.now() / 1000);
    const finalBalance = await testBalance();
    
    if (finalBalance !== null) {
      console.log(`💰 Final Balance: $${finalBalance}`);
      
      // Analysis
      console.log('\n📊 **ANALYSIS**');
      console.log('==============');
      
      const betDifference = Math.abs(currentBalance - betBalance);
      const cancelDifference = Math.abs(cancelBalance - currentBalance);
      const finalDifference = Math.abs(finalBalance - currentBalance);
      
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
        console.log(`❌ Balance changed by: $${(finalBalance - currentBalance).toFixed(2)}`);
      }
      
      // Check if cancel and final balance match
      if (Math.abs(cancelBalance - finalBalance) < 0.01) {
        console.log('✅ BALANCE CONSISTENCY: PASSED - Cancel and final balance match');
      } else {
        console.log('❌ BALANCE CONSISTENCY: FAILED - Cancel and final balance differ');
        console.log(`❌ Cancel: $${cancelBalance}, Final: $${finalBalance}`);
      }
    }
  } else {
    console.log('❌ Cancel operation failed');
  }
  
  console.log('\n🎯 **TEST COMPLETED**');
  console.log('🎮 Continue playing at https://jackpotx.net/play/47');
}

// Run the tests
runGame47Test().catch(console.error); 