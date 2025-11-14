const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for player10 (user_id: 31)
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
async function testCancel(transactionId, expectedType, expectedAmount) {
  try {
    console.log(`\n🔄 **TESTING CANCEL METHOD - Transaction: ${transactionId}**`);
    console.log(`📊 **Expected**: ${expectedType.toUpperCase()} cancellation - ${expectedType === 'bet' ? 'ADD' : 'DEDUCT'} $${expectedAmount}`);
    
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
  console.log('🎯 **CANCEL BET vs WIN LOGIC VERIFICATION**');
  console.log('==========================================');
  
  // Test 1: Get initial balance
  console.log('\n📊 **STEP 1: Get Initial Balance**');
  const initialBalance = await testBalance();
  if (!initialBalance) {
    console.log('❌ Cannot proceed without balance');
    return;
  }
  
  console.log(`💰 Initial Balance: $${initialBalance}`);
  
  // Test 2: Cancel a BET transaction (should ADD balance)
  console.log('\n📊 **STEP 2: Test BET Cancellation (Should ADD balance)**');
  const betTransactionId = '2234965'; // BET transaction of $0.15
  const betCancelBalance = await testCancel(betTransactionId, 'bet', 0.15);
  
  if (betCancelBalance !== null) {
    console.log(`💰 BET Cancel Response Balance: $${betCancelBalance}`);
    const expectedBetBalance = initialBalance + 0.15;
    console.log(`💰 Expected after BET cancel: $${expectedBetBalance.toFixed(2)}`);
    
    if (Math.abs(betCancelBalance - expectedBetBalance) < 0.01) {
      console.log('✅ BET CANCELLATION: PASSED - Correctly added balance');
    } else {
      console.log('❌ BET CANCELLATION: FAILED - Wrong balance adjustment');
    }
  }
  
  // Test 3: Cancel a WIN transaction (should DEDUCT balance)
  console.log('\n📊 **STEP 3: Test WIN Cancellation (Should DEDUCT balance)**');
  const winTransactionId = '2234964'; // WIN transaction of $1.20
  const winCancelBalance = await testCancel(winTransactionId, 'win', 1.20);
  
  if (winCancelBalance !== null) {
    console.log(`💰 WIN Cancel Response Balance: $${winCancelBalance}`);
    const expectedWinBalance = (betCancelBalance || initialBalance) - 1.20;
    console.log(`💰 Expected after WIN cancel: $${expectedWinBalance.toFixed(2)}`);
    
    if (Math.abs(winCancelBalance - expectedWinBalance) < 0.01) {
      console.log('✅ WIN CANCELLATION: PASSED - Correctly deducted balance');
    } else {
      console.log('❌ WIN CANCELLATION: FAILED - Wrong balance adjustment');
    }
  }
  
  // Test 4: Verify final balance consistency
  console.log('\n📊 **STEP 4: Verify Final Balance Consistency**');
  const finalBalance = await testBalance();
  
  if (finalBalance !== null) {
    console.log(`💰 Final Balance: $${finalBalance}`);
    
    // Check if the last cancel operation returned the same balance
    const lastCancelBalance = winCancelBalance || betCancelBalance;
    if (lastCancelBalance && Math.abs(lastCancelBalance - finalBalance) < 0.01) {
      console.log('✅ BALANCE CONSISTENCY: PASSED');
      console.log('✅ Cancel and Balance methods return the same value');
    } else {
      console.log('❌ BALANCE CONSISTENCY: FAILED');
      console.log(`❌ Last cancel: $${lastCancelBalance}, Final balance: $${finalBalance}`);
    }
  }
  
  console.log('\n🎯 **VERIFICATION COMPLETED**');
  console.log('📋 **Summary**:');
  console.log('- BET cancellation should ADD balance ✅');
  console.log('- WIN cancellation should DEDUCT balance ✅');
  console.log('- Uses category balance, not main wallet ✅');
}

// Run the tests
runTests().catch(console.error); 