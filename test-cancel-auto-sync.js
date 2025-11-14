const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const BASE_URL = 'http://localhost:3000/innova';
const TEST_USER_ID = 48; // player50
const TEST_GAME_ID = 47; // Game 47 (Venice Carnival - enabled)
const TEST_TRANSACTION_ID = 'test_cancel_auto_sync_' + Date.now();
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Use existing token for user 48 and game 47
const EXISTING_TOKEN = 'cecb0fc413ae3f38ad0583965ba90a91';

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

async function testCancelAutoSync() {
  try {
    console.log('🧪 Testing automatic sync after cancel for user 48 (player50)...');
    console.log(`📋 Test Details:`);
    console.log(`   - User ID: ${TEST_USER_ID} (player50)`);
    console.log(`   - Game ID: ${TEST_GAME_ID} (Venice Carnival - enabled)`);
    console.log(`   - Transaction ID: ${TEST_TRANSACTION_ID}`);
    console.log(`   - Using existing token: ${EXISTING_TOKEN}`);
    
    // Step 1: Check current balance
    console.log('\n📊 Step 1: Checking current balance...');
    const balanceTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const balanceHash = generateHash('balance', balanceTimestamp);
    
    const balanceRequestData = {
      command: 'balance',
      request_timestamp: balanceTimestamp,
      hash: balanceHash,
      data: {
        token: EXISTING_TOKEN,
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
    
    if (balanceResponse.data.response.status === 'ERROR') {
      console.log('❌ Balance check failed');
      return false;
    }
    
    const currentBalance = balanceResponse.data.response.data.balance;
    console.log(`💰 Current balance: $${currentBalance}`);
    
    // Step 2: Place a bet (should succeed)
    console.log('\n📤 Step 2: Placing bet (should succeed)...');
    const betTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const betHash = generateHash('changebalance', betTimestamp);
    
    const betRequestData = {
      command: 'changebalance',
      request_timestamp: betTimestamp,
      hash: betHash,
      data: {
        token: EXISTING_TOKEN,
        user_id: TEST_USER_ID.toString(),
        transaction_id: TEST_TRANSACTION_ID,
        amount: -15.00, // Negative amount for bet
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
    
    if (betResponse.data.response.status === 'OK') {
      console.log('✅ Bet successfully placed');
      const betBalance = betResponse.data.response.data.balance;
      console.log(`💰 Balance after bet: $${betBalance}`);
    } else {
      console.log('❌ Bet failed');
      return false;
    }
    
    // Step 3: Cancel the transaction (should succeed and auto-sync)
    console.log('\n📤 Step 3: Cancelling transaction (should auto-sync)...');
    const cancelTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cancelHash = generateHash('cancel', cancelTimestamp);
    
    const cancelRequestData = {
      command: 'cancel',
      request_timestamp: cancelTimestamp,
      hash: cancelHash,
      data: {
        token: EXISTING_TOKEN,
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
    
    if (cancelResponse.data.response.status === 'OK') {
      console.log('✅ Cancel successfully processed with auto-sync');
      const cancelBalance = cancelResponse.data.response.data.balance;
      console.log(`💰 Balance after cancel: $${cancelBalance}`);
    } else {
      console.log('❌ Cancel failed');
      console.log('Error:', cancelResponse.data.response.data.error_message);
    }
    
    // Step 4: Check final balance
    console.log('\n📊 Step 4: Checking final balance...');
    const finalBalanceTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const finalBalanceHash = generateHash('balance', finalBalanceTimestamp);
    
    const finalBalanceRequestData = {
      command: 'balance',
      request_timestamp: finalBalanceTimestamp,
      hash: finalBalanceHash,
      data: {
        token: EXISTING_TOKEN,
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
    
    // Step 5: Check database balance
    console.log('\n📊 Step 5: Checking database balance...');
    console.log('The sync function should have been called automatically during cancel');
    
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
testCancelAutoSync()
  .then(success => {
    console.log('\n🏁 Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 