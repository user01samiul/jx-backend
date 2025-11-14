const axios = require('axios');
const crypto = require('crypto');

const SECRET_KEY = '2xk3SrX09oQ71Z3F';
const API_BASE_URL = 'https://backend.jackpotx.net/api/innova';

// Generate X-Authorization header (for command validation)
function generateXAuthorization(command) {
  return crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
}

// Generate request hash (for request validation)
function generateRequestHash(command, requestTimestamp) {
  return crypto.createHash('sha1').update(command + requestTimestamp + SECRET_KEY).digest('hex');
}

async function testBalanceFix() {
  const token = '3ca0a36a0ceb7a2befda77a6a934b9bf'; // Valid token for user 48
  
  console.log('=== BALANCE FIX TEST ===\n');
  
  // Step 1: Place a bet
  console.log('=== STEP 1: Placing a bet ===');
  
  const betData = {
    transaction_id: '2248000',
    amount: 5.00,
    urid: 'WT0811200000001test99',
    history_id: '2-balance1'
  };
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  const betRequestData = {
    command: 'changebalance',
    data: {
      transaction_type: 'BET',
      reason: 'SPIN',
      amount: betData.amount,
      currency_code: 'USD',
      transaction_id: betData.transaction_id,
      transaction_timestamp: timestamp,
      round_id: '1355600',
      round_finished: false,
      game_id: 15,
      user_id: '48',
      token: token,
      context: {
        reason: 'SPIN',
        urid: betData.urid,
        history_id: betData.history_id
      }
    },
    request_timestamp: timestamp,
    hash: generateRequestHash('changebalance', timestamp)
  };

  const headers = {
    'X-Authorization': generateXAuthorization('changebalance'),
    'X-Operator-Id': 'thinkcode_stg',
    'X-TT-Operator-Id': 'thinkcode_stg',
    'X-Req-Id': betData.urid,
    'Content-Type': 'application/json'
  };

  try {
    const betResponse = await axios.post(`${API_BASE_URL}/changebalance`, betRequestData, { headers });
    console.log(`Bet ${betData.transaction_id}: ${betData.amount} USD - Balance: ${betResponse.data.response.data.balance}`);
  } catch (error) {
    console.error(`Error with bet ${betData.transaction_id}:`, error.response ? error.response.data : error.message);
    return;
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: Process a win
  console.log('\n=== STEP 2: Processing a win ===');
  
  const winData = {
    transaction_id: '2248100',
    amount: 7.50, // 50% profit
    urid: betData.urid, // Same session as the bet
    history_id: '2-win1'
  };
  
  const winTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  const winRequestData = {
    command: 'changebalance',
    data: {
      transaction_type: 'WIN',
      reason: 'SPIN',
      amount: winData.amount,
      currency_code: 'USD',
      transaction_id: winData.transaction_id,
      transaction_timestamp: winTimestamp,
      round_id: '1355600',
      round_finished: true,
      game_id: 15,
      user_id: '48',
      token: token,
      context: {
        reason: 'SPIN',
        urid: winData.urid,
        history_id: winData.history_id
      }
    },
    request_timestamp: winTimestamp,
    hash: generateRequestHash('changebalance', winTimestamp)
  };

  try {
    const winResponse = await axios.post(`${API_BASE_URL}/changebalance`, winRequestData, { headers });
    console.log(`Win ${winData.transaction_id}: ${winData.amount} USD - Balance: ${winResponse.data.response.data.balance}`);
  } catch (error) {
    console.error(`Error with win ${winData.transaction_id}:`, error.response ? error.response.data : error.message);
  }
  
  // Step 3: Check database
  console.log('\n=== STEP 3: Database verification ===');
  
  const { exec } = require('child_process');
  
  // Check current balance
  exec('docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT balance FROM user_category_balances WHERE user_id = 48;"', (error, stdout, stderr) => {
    if (error) {
      console.error('Balance check error:', error);
      return;
    }
    console.log('Current database balance:', stdout.trim());
  });
  
  // Check transactions
  exec('docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT external_reference, type, amount, balance_after FROM transactions WHERE external_reference IN (\'2248000\', \'2248100\') ORDER BY created_at;"', (error, stdout, stderr) => {
    if (error) {
      console.error('Transaction check error:', error);
      return;
    }
    console.log('\nTransactions:');
    console.log(stdout);
  });
}

testBalanceFix(); 