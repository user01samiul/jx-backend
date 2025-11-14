const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for player10 (user_id: 31)
const testData = {
  user_id: 31,
  game_id: 2,
  round_id: 1349642,
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
  console.log('🎯 **CANCEL TRANSACTION 2234927 TEST**');
  console.log('======================================');
  
  // Test cancel operation
  const transactionToCancel = '2234927'; // Win transaction of $0.06
  const cancelBalance = await testCancel(transactionToCancel);
  
  if (cancelBalance !== null) {
    console.log(`💰 Cancel Response Balance: $${cancelBalance}`);
  } else {
    console.log('❌ Cancel operation failed');
  }
  
  console.log('\n🎯 **TEST COMPLETED**');
}

// Run the tests
runTests().catch(console.error); 