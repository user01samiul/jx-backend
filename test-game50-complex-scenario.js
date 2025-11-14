const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const BASE_URL = 'http://localhost:3000/innova';
const TEST_USER_ID = 48; // player50
const TEST_GAME_ID = 50; // Game 50 (Legend Of Emerald - enabled)
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Use existing token for user 48 and game 50
const EXISTING_TOKEN = 'b1f9c0cb265e6495ce275b1eaaf82846';

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

async function testGame50ComplexScenario() {
  try {
    console.log('🧪 Testing complex scenario on game 50 (Legend Of Emerald) for user 48 (player50)...');
    console.log(`📋 Test Details:`);
    console.log(`   - User ID: ${TEST_USER_ID} (player50)`);
    console.log(`   - Game ID: ${TEST_GAME_ID} (Legend Of Emerald - enabled)`);
    console.log(`   - Scenario: 1 bet, 2 wins, then test cancel`);
    console.log(`   - Using existing token: ${EXISTING_TOKEN}`);
    
    // Step 1: Check initial balance
    console.log('\n📊 Step 1: Checking initial balance...');
    const initialBalanceTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const initialBalanceHash = generateHash('balance', initialBalanceTimestamp);
    
    const initialBalanceRequestData = {
      command: 'balance',
      request_timestamp: initialBalanceTimestamp,
      hash: initialBalanceHash,
      data: {
        token: EXISTING_TOKEN,
        game_id: TEST_GAME_ID
      }
    };
    
    const initialBalanceAuthHeader = generateAuthHeader('balance');
    const initialBalanceResponse = await axios.post(BASE_URL, initialBalanceRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': initialBalanceAuthHeader
      }
    });
    
    console.log('Initial Balance Response:', JSON.stringify(initialBalanceResponse.data, null, 2));
    
    if (initialBalanceResponse.data.response.status === 'ERROR') {
      console.log('❌ Initial balance check failed');
      return false;
    }
    
    const initialBalance = initialBalanceResponse.data.response.data.balance;
    console.log(`💰 Initial balance: $${initialBalance}`);
    
    // Step 2: Place 1 bet (small amount)
    console.log('\n📤 Step 2: Placing 1 bet...');
    const betTransactions = [];
    
    const betId = `test_game50_bet_1_${Date.now()}`;
    const betAmount = 1; // $1 bet
    
    console.log(`\n📤 Placing bet: $${betAmount}`);
    
    const betTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const betHash = generateHash('changebalance', betTimestamp);
    
    const betRequestData = {
      command: 'changebalance',
      request_timestamp: betTimestamp,
      hash: betHash,
      data: {
        token: EXISTING_TOKEN,
        user_id: TEST_USER_ID.toString(),
        transaction_id: betId,
        amount: -betAmount, // Negative amount for bet
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
    
    console.log(`Bet Response:`, JSON.stringify(betResponse.data, null, 2));
    
    if (betResponse.data.response.status === 'OK') {
      console.log(`✅ Bet successfully placed: $${betAmount}`);
      betTransactions.push({
        id: betId,
        amount: betAmount,
        balance: betResponse.data.response.data.balance
      });
    } else {
      console.log(`❌ Bet failed`);
      return false;
    }
    
    // Step 3: Place 2 wins
    console.log('\n📤 Step 3: Placing 2 wins...');
    const winTransactions = [];
    
    for (let i = 1; i <= 2; i++) {
      const winId = `test_game50_win_${i}_${Date.now()}`;
      const winAmount = 2 * i; // $2, $4
      
      console.log(`\n📤 Placing win ${i}: $${winAmount}`);
      
      const winTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const winHash = generateHash('changebalance', winTimestamp);
      
      const winRequestData = {
        command: 'changebalance',
        request_timestamp: winTimestamp,
        hash: winHash,
        data: {
          token: EXISTING_TOKEN,
          user_id: TEST_USER_ID.toString(),
          transaction_id: winId,
          amount: winAmount, // Positive amount for win
          currency_code: 'USD',
          game_id: TEST_GAME_ID
        }
      };
      
      const winAuthHeader = generateAuthHeader('changebalance');
      const winResponse = await axios.post(BASE_URL, winRequestData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': winAuthHeader
        }
      });
      
      console.log(`Win ${i} Response:`, JSON.stringify(winResponse.data, null, 2));
      
      if (winResponse.data.response.status === 'OK') {
        console.log(`✅ Win ${i} successfully placed: $${winAmount}`);
        winTransactions.push({
          id: winId,
          amount: winAmount,
          balance: winResponse.data.response.data.balance
        });
      } else {
        console.log(`❌ Win ${i} failed`);
        return false;
      }
    }
    
    // Step 4: Check balance after all transactions
    console.log('\n📊 Step 4: Checking balance after all transactions...');
    const midBalanceTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const midBalanceHash = generateHash('balance', midBalanceTimestamp);
    
    const midBalanceRequestData = {
      command: 'balance',
      request_timestamp: midBalanceTimestamp,
      hash: midBalanceHash,
      data: {
        token: EXISTING_TOKEN,
        game_id: TEST_GAME_ID
      }
    };
    
    const midBalanceAuthHeader = generateAuthHeader('balance');
    const midBalanceResponse = await axios.post(BASE_URL, midBalanceRequestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': midBalanceAuthHeader
      }
    });
    
    const midBalance = midBalanceResponse.data.response.data.balance;
    console.log(`💰 Balance after all transactions: $${midBalance}`);
    
    // Step 5: Test cancel on the bet transaction
    console.log('\n📤 Step 5: Testing cancel on bet transaction...');
    const betToCancel = betTransactions[0]; // Cancel the bet ($1)
    
    console.log(`\n📤 Cancelling bet: ${betToCancel.id} ($${betToCancel.amount})`);
    
    const cancelTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const cancelHash = generateHash('cancel', cancelTimestamp);
    
    const cancelRequestData = {
      command: 'cancel',
      request_timestamp: cancelTimestamp,
      hash: cancelHash,
      data: {
        token: EXISTING_TOKEN,
        user_id: TEST_USER_ID.toString(),
        transaction_id: betToCancel.id,
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
      console.log(`✅ Cancel successfully processed for bet: $${betToCancel.amount}`);
      const cancelBalance = cancelResponse.data.response.data.balance;
      console.log(`💰 Balance after cancel: $${cancelBalance}`);
    } else {
      console.log('❌ Cancel failed');
      console.log('Error:', cancelResponse.data.response.data.error_message);
    }
    
    // Step 6: Check final balance
    console.log('\n📊 Step 6: Checking final balance...');
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
    console.log(`📈 Total balance change: $${finalBalance - initialBalance}`);
    
    // Step 7: Summary
    console.log('\n📊 Step 7: Transaction Summary...');
    console.log(`Initial Balance: $${initialBalance}`);
    console.log(`Bets placed: ${betTransactions.length} ($${betTransactions.reduce((sum, t) => sum + t.amount, 0)})`);
    console.log(`Wins placed: ${winTransactions.length} ($${winTransactions.reduce((sum, t) => sum + t.amount, 0)})`);
    console.log(`Bet cancelled: $${betToCancel.amount}`);
    console.log(`Final Balance: $${finalBalance}`);
    
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
testGame50ComplexScenario()
  .then(success => {
    console.log('\n🏁 Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 