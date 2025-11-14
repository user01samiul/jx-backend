const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Generate a fresh transaction ID
const freshTransactionId = Math.floor(Math.random() * 9000000) + 1000000;
const freshRoundId = Math.floor(Math.random() * 9000000) + 1000000;

// Test data for player10 (user_id: 31)
const testData = {
  user_id: 31,
  game_id: 2,
  round_id: freshRoundId,
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

// Test bet method to create a transaction
async function testBet() {
  try {
    console.log(`\n🎲 **TESTING BET METHOD - Transaction: ${freshTransactionId}**`);
    
    const betPayload = {
      command: 'changebalance',
      data: {
        user_id: testData.user_id.toString(),
        token: '528597282ee9f25466991e0166f2ec02',
        transaction_id: freshTransactionId.toString(),
        transaction_type: 'BET',
        amount: '0.50',
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

// Test cancel method
async function testCancel(transactionId) {
  try {
    console.log(`\n🔄 **TESTING CANCEL METHOD - Transaction: ${transactionId}**`);
    
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
async function runTests() {
  console.log('🎯 **FRESH CANCEL TEST**');
  console.log('========================');
  console.log(`📝 Fresh Transaction ID: ${freshTransactionId}`);
  console.log(`📝 Fresh Round ID: ${freshRoundId}`);
  
  // Test 1: Get initial balance
  console.log('\n📊 **STEP 1: Get Initial Balance**');
  const initialBalance = await testBalance();
  if (!initialBalance) {
    console.log('❌ Cannot proceed without balance');
    return;
  }
  
  console.log(`💰 Initial Balance: $${initialBalance}`);
  
  // Test 2: Create a bet transaction
  console.log('\n📊 **STEP 2: Create Bet Transaction**');
  const betBalance = await testBet();
  
  if (betBalance !== null) {
    console.log(`💰 Bet Response Balance: $${betBalance}`);
    
    // Test 3: Cancel the transaction
    console.log('\n📊 **STEP 3: Cancel Transaction**');
    const cancelBalance = await testCancel(freshTransactionId);
    
    if (cancelBalance !== null) {
      console.log(`💰 Cancel Response Balance: $${cancelBalance}`);
      
      // Test 4: Verify final balance
      console.log('\n📊 **STEP 4: Verify Final Balance**');
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
        
        // Check if balance was restored after cancel
        const balanceDifference = Math.abs(finalBalance - initialBalance);
        if (balanceDifference < 0.01) {
          console.log('✅ BALANCE RESTORATION: PASSED');
          console.log('✅ Balance was properly restored after cancellation');
        } else {
          console.log('❌ BALANCE RESTORATION: FAILED');
          console.log(`❌ Initial: $${initialBalance}, Final: $${finalBalance}, Difference: $${balanceDifference}`);
        }
      }
    } else {
      console.log('❌ Cancel operation failed');
    }
  } else {
    console.log('❌ Bet operation failed');
  }
  
  console.log('\n🎯 **TEST COMPLETED**');
}

// Run the tests
runTests().catch(console.error); 