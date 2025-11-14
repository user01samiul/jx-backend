const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const BASE_URL = 'http://localhost:3000/innova';
const TEST_USER_ID = 31; // player10
const TEST_GAME_ID = 44; // game 44 (should be disabled)
const TEST_TRANSACTION_ID = 'test_win_no_gameid_' + Date.now();
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

async function testWinTransactionWithoutGameId() {
  try {
    console.log('🧪 Testing WIN transaction without game_id on disabled game...');
    console.log(`📋 Test Details:`);
    console.log(`   - User ID: ${TEST_USER_ID}`);
    console.log(`   - Game ID: ${TEST_GAME_ID} (from original transaction)`);
    console.log(`   - Transaction ID: ${TEST_TRANSACTION_ID}`);
    console.log(`   - Note: Request will NOT include game_id`);
    
    // First, create a transaction with game_id to establish the metadata
    console.log('\n📤 Step 1: Creating original transaction with game_id...');
    const timestamp1 = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const hash1 = generateHash('changebalance', timestamp1);
    
    const originalRequestData = {
      command: 'changebalance',
      request_timestamp: timestamp1,
      hash: hash1,
      data: {
        user_id: TEST_USER_ID.toString(),
        transaction_id: TEST_TRANSACTION_ID,
        amount: 5.00,
        currency_code: 'USD',
        game_id: TEST_GAME_ID
      }
    };
    
    try {
      const authHeader = generateAuthHeader('changebalance');
      const originalResponse = await axios.post(BASE_URL, originalRequestData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': authHeader
        }
      });
      console.log('Original transaction response:', JSON.stringify(originalResponse.data, null, 2));
    } catch (error) {
      if (error.response && error.response.data.response && error.response.data.response.error_code === 'OP_35') {
        console.log('✅ Original transaction correctly returned OP_35 for disabled game!');
        return true;
      }
      console.log('Original transaction error:', error.response?.data || error.message);
    }
    
    // Now try WIN transaction without game_id (retry scenario)
    console.log('\n📤 Step 2: Sending WIN transaction retry WITHOUT game_id...');
    const timestamp2 = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const hash2 = generateHash('changebalance', timestamp2);
    
    const retryRequestData = {
      command: 'changebalance',
      request_timestamp: timestamp2,
      hash: hash2,
      data: {
        user_id: TEST_USER_ID.toString(),
        transaction_id: TEST_TRANSACTION_ID, // Same transaction ID
        amount: 10.00,
        currency_code: 'USD'
        // Note: NO game_id in this request
      }
    };
    
    console.log('Retry Request:', JSON.stringify(retryRequestData, null, 2));
    
    // Send retry request
    const retryAuthHeader = generateAuthHeader('changebalance');
    const retryResponse = await axios.post(BASE_URL, retryRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': retryAuthHeader
      }
    });
    
    console.log('\n📥 Retry Response received:');
    console.log('Status:', retryResponse.status);
    console.log('Response:', JSON.stringify(retryResponse.data, null, 2));
    
    // Check if we got OP_35 error
    if (retryResponse.data.response && retryResponse.data.response.error_code === 'OP_35') {
      console.log('\n✅ SUCCESS: WIN transaction retry correctly returned OP_35 for disabled game!');
      return true;
    } else {
      console.log('\n❌ FAILURE: WIN transaction retry did not return OP_35 for disabled game!');
      console.log('Expected: OP_35 error');
      console.log('Actual:', retryResponse.data.response?.error_code || 'No error code');
      return false;
    }
    
  } catch (error) {
    console.log('\n❌ ERROR during retry test:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      
      // Check if we got OP_35 error in error response
      if (error.response.data.response && error.response.data.response.error_code === 'OP_35') {
        console.log('\n✅ SUCCESS: WIN transaction retry correctly returned OP_35 for disabled game!');
        return true;
      }
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Run the test
testWinTransactionWithoutGameId()
  .then(success => {
    console.log('\n🏁 Test completed:', success ? 'PASSED' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 