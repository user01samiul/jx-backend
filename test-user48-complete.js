const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const BASE_URL = 'http://localhost:3000/innova';
const TEST_USER_ID = 48; // player50
const TEST_GAME_ID = 44; // Game 44 (disabled)
const TEST_TRANSACTION_ID = 'test_cancel_disabled_game_' + Date.now();
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

async function testUser48Complete() {
  try {
    console.log('🧪 Complete test for user 48 (player50) on disabled game...');
    console.log(`📋 Test Details:`);
    console.log(`   - User ID: ${TEST_USER_ID} (player50)`);
    console.log(`   - Game ID: ${TEST_GAME_ID} (disabled)`);
    console.log(`   - Transaction ID: ${TEST_TRANSACTION_ID}`);
    
    // Step 1: Authenticate user to get token
    console.log('\n🔐 Step 1: Authenticating user...');
    const authTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const authHash = generateHash('authenticate', authTimestamp);
    
    const authRequestData = {
      command: 'authenticate',
      request_timestamp: authTimestamp,
      hash: authHash,
      data: {
        user_id: TEST_USER_ID.toString(),
        currency_code: 'USD',
        game_id: TEST_GAME_ID
      }
    };
    
    const authAuthHeader = generateAuthHeader('authenticate');
    const authResponse = await axios.post(BASE_URL, authRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': authAuthHeader
      }
    });
    
    console.log('Auth Response:', JSON.stringify(authResponse.data, null, 2));
    
    if (authResponse.data.response.status === 'ERROR') {
      console.log('❌ Authentication failed');
      return false;
    }
    
    const token = authResponse.data.response.data.token;
    console.log(`✅ Authentication successful, token: ${token}`);
    
    // Step 2: Check balance using token
    console.log('\n📊 Step 2: Checking balance with token...');
    const balanceTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const balanceHash = generateHash('balance', balanceTimestamp);
    
    const balanceRequestData = {
      command: 'balance',
      request_timestamp: balanceTimestamp,
      hash: balanceHash,
      data: {
        token: token,
        game_id: TEST_GAME_ID
      }
    };
    
    const balanceAuthHeader = generateAuthHeader('balance');
    const balanceResponse = await axios.post(BASE_URL, balanceRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': balanceAuthHeader
      }
    });
    
    console.log('Balance Response:', JSON.stringify(balanceResponse.data, null, 2));
    
    const currentBalance = balanceResponse.data.response.data.balance;
    console.log(`💰 Current balance: $${currentBalance}`);
    
    // Step 3: Try to place a bet on disabled game (should fail)
    console.log('\n📤 Step 3: Trying to place bet on disabled game (should fail)...');
    const betTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const betHash = generateHash('changebalance', betTimestamp);
    
    const betRequestData = {
      command: 'changebalance',
      request_timestamp: betTimestamp,
      hash: betHash,
      data: {
        token: token,
        user_id: TEST_USER_ID.toString(),
        transaction_id: TEST_TRANSACTION_ID,
        amount: -10.00, // Negative amount for bet
        currency_code: 'USD',
        game_id: TEST_GAME_ID
      }
    };
    
    const betAuthHeader = generateAuthHeader('changebalance');
    const betResponse = await axios.post(BASE_URL, betRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': betAuthHeader
      }
    });
    
    console.log('Bet Response:', JSON.stringify(betResponse.data, null, 2));
    
    if (betResponse.data.response.status === 'ERROR' && betResponse.data.response.data.error_code === 'OP_35') {
      console.log('✅ Bet correctly rejected with OP_35: Game is disabled');
    } else {
      console.log('❌ Bet was not rejected as expected');
    }
    
    // Step 4: Try to cancel the transaction (should also fail)
    console.log('\n📤 Step 4: Trying to cancel transaction on disabled game...');
    const cancelTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cancelHash = generateHash('cancel', cancelTimestamp);
    
    const cancelRequestData = {
      command: 'cancel',
      request_timestamp: cancelTimestamp,
      hash: cancelHash,
      data: {
        token: token,
        user_id: TEST_USER_ID.toString(),
        transaction_id: TEST_TRANSACTION_ID,
        game_id: TEST_GAME_ID
      }
    };
    
    const cancelAuthHeader = generateAuthHeader('cancel');
    const cancelResponse = await axios.post(BASE_URL, cancelRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': cancelAuthHeader
      }
    });
    
    console.log('Cancel Response:', JSON.stringify(cancelResponse.data, null, 2));
    
    if (cancelResponse.data.response.status === 'ERROR' && cancelResponse.data.response.data.error_code === 'OP_35') {
      console.log('✅ Cancel correctly rejected with OP_35: Game is disabled');
    } else {
      console.log('❌ Cancel was not rejected as expected');
    }
    
    // Step 5: Check final balance
    console.log('\n📊 Step 5: Checking final balance...');
    const finalBalanceTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const finalBalanceHash = generateHash('balance', finalBalanceTimestamp);
    
    const finalBalanceRequestData = {
      command: 'balance',
      request_timestamp: finalBalanceTimestamp,
      hash: finalBalanceHash,
      data: {
        token: token,
        game_id: TEST_GAME_ID
      }
    };
    
    const finalBalanceAuthHeader = generateAuthHeader('balance');
    const finalBalanceResponse = await axios.post(BASE_URL, finalBalanceRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': finalBalanceAuthHeader
      }
    });
    
    const finalBalance = finalBalanceResponse.data.response.data.balance;
    console.log(`💰 Final balance: $${finalBalance}`);
    console.log(`📈 Balance change: $${finalBalance - currentBalance}`);
    
    return true;
    
  } catch (error) {
    console.log('\n❌ ERROR during test:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

// Run the test
testUser48Complete()
  .then(success => {
    console.log('\n🏁 Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 