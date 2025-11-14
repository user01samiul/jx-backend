const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const BASE_URL = 'http://localhost:3000/innova';
const TEST_USER_ID = 31; // player10
const TEST_GAME_ID = 44; // Game 44 (now disabled)
const TEST_TRANSACTION_ID = 'test_win_disabled_game_' + Date.now();
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Generate authorization header
function generateAuthHeader(command) {
  return crypto.createHash('sha1')
    .update(command + SECRET_KEY)
    .digest('hex');
}

// Generate request hash
function generateHash(command, timestamp) {
  return crypto.createHash('sha1')
    .update(command + timestamp + SECRET_KEY)
    .digest('hex');
}

async function testWinTransactionOnDisabledGame() {
  try {
    console.log('🧪 Testing WIN transaction on disabled game...');
    console.log(`📋 Test Details:`);
    console.log(`   - User ID: ${TEST_USER_ID}`);
    console.log(`   - Game ID: ${TEST_GAME_ID} (disabled)`);
    console.log(`   - Transaction ID: ${TEST_TRANSACTION_ID}`);
    
    // Create WIN transaction request
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const hash = generateHash('changebalance', timestamp);
    
    const requestData = {
      command: 'changebalance',
      request_timestamp: timestamp,
      hash: hash,
      data: {
        user_id: TEST_USER_ID.toString(),
        transaction_id: TEST_TRANSACTION_ID,
        amount: 10.00,
        currency_code: 'USD',
        game_id: TEST_GAME_ID
      }
    };
    
    console.log('\n📤 Sending WIN transaction request...');
    console.log('Request:', JSON.stringify(requestData, null, 2));
    
    // Send request
    const authHeader = generateAuthHeader('changebalance');
    const response = await axios.post(BASE_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': authHeader
      }
    });
    
    console.log('\n📥 Response received:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
              // Check if we got OP_35 error
    if (response.data.response && response.data.response.status === 'ERROR' && response.data.response.data && response.data.response.data.error_code === 'OP_35') {
      console.log('\n✅ SUCCESS: WIN transaction correctly returned OP_35 for disabled game!');
      return true;
    } else {
      console.log('\n❌ FAILURE: WIN transaction did not return OP_35 for disabled game!');
      console.log('Expected: OP_35 error');
      console.log('Actual:', response.data.response?.data?.error_code || 'No error code');
      return false;
    }
    
  } catch (error) {
    console.log('\n❌ ERROR during test:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      
      // Check if we got OP_35 error in error response
      if (error.response.data.response && error.response.data.response.status === 'ERROR' && error.response.data.response.data && error.response.data.response.data.error_code === 'OP_35') {
        console.log('\n✅ SUCCESS: WIN transaction correctly returned OP_35 for disabled game!');
        return true;
      }
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Run the test
testWinTransactionOnDisabledGame()
  .then(success => {
    console.log('\n🏁 Test completed:', success ? 'PASSED' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 