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

// Test cancel method on the recent transaction
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
  console.log('🎯 **CANCEL RECENT TRANSACTION TEST**');
  console.log('=====================================');
  
  // Test 1: Get current balance
  console.log('\n📊 **STEP 1: Get Current Balance**');
  const currentBalance = await testBalance();
  if (!currentBalance) {
    console.log('❌ Cannot proceed without balance');
    return;
  }
  
  console.log(`💰 Current Balance: $${currentBalance}`);
  
  // Test 2: Cancel the recent transaction (8798000)
  console.log('\n📊 **STEP 2: Cancel Recent Transaction**');
  const recentTransactionId = '8798000'; // The transaction from the previous test
  const cancelBalance = await testCancel(recentTransactionId);
  
  if (cancelBalance !== null) {
    console.log(`💰 Cancel Response Balance: $${cancelBalance}`);
    
    // Test 3: Verify final balance
    console.log('\n📊 **STEP 3: Verify Final Balance**');
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
      const balanceDifference = Math.abs(finalBalance - currentBalance);
      if (balanceDifference < 0.01) {
        console.log('✅ BALANCE RESTORATION: PASSED');
        console.log('✅ Balance was properly restored after cancellation');
      } else {
        console.log('❌ BALANCE RESTORATION: FAILED');
        console.log(`❌ Current: $${currentBalance}, Final: $${finalBalance}, Difference: $${balanceDifference}`);
      }
    }
  } else {
    console.log('❌ Cancel operation failed');
  }
  
  console.log('\n🎯 **TEST COMPLETED**');
}

// Run the tests
runTests().catch(console.error); 