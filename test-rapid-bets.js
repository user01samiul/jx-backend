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

async function testRapidBets() {
  const token = '3ca0a36a0ceb7a2befda77a6a934b9bf'; // Valid token for user 48
  const baseTimestamp = '2025-08-11 17:00:00';
  
  console.log('Testing rapid legitimate bets to verify duplicate detection fix...\n');
  
  // Test 1: First bet
  const transaction1 = {
    transaction_id: '2245400',
    amount: 1.50,
    round_id: 1355200,
    urid: 'WT0811170000001test99',
    history_id: '2-test001'
  };
  
  // Test 2: Second bet (same amount, different round)
  const transaction2 = {
    transaction_id: '2245401',
    amount: 1.50,
    round_id: 1355201,
    urid: 'WT0811170000002test99',
    history_id: '2-test002'
  };
  
  // Test 3: Third bet (same amount, different round)
  const transaction3 = {
    transaction_id: '2245402',
    amount: 1.50,
    round_id: 1355202,
    urid: 'WT0811170000003test99',
    history_id: '2-test003'
  };
  
  const transactions = [transaction1, transaction2, transaction3];
  
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const timestamp = new Date(Date.now() + i * 1000).toISOString().replace('T', ' ').substring(0, 19);
    
    const requestData = {
      command: 'changebalance',
      data: {
        transaction_type: 'BET',
        reason: 'SPIN',
        amount: tx.amount,
        currency_code: 'USD',
        transaction_id: tx.transaction_id,
        transaction_timestamp: timestamp,
        round_id: tx.round_id,
        round_finished: false,
        game_id: 15,
        user_id: '48',
        token: token,
        context: {
          reason: 'SPIN',
          urid: tx.urid,
          history_id: tx.history_id
        }
      },
      request_timestamp: timestamp,
      hash: generateRequestHash('changebalance', timestamp)
    };

    const headers = {
      'X-Authorization': generateXAuthorization('changebalance'),
      'X-Operator-Id': 'thinkcode_stg',
      'X-TT-Operator-Id': 'thinkcode_stg',
      'X-Req-Id': tx.urid,
      'Content-Type': 'application/json'
    };

    try {
      console.log(`\n--- Test ${i + 1}: Bet ${tx.transaction_id} (${tx.amount} USD) ---`);
      console.log(`Round ID: ${tx.round_id}, Session: ${tx.urid}`);
      
      const response = await axios.post(`${API_BASE_URL}/changebalance`, requestData, { headers });
      
      console.log('Response status:', response.status);
      console.log('Balance returned:', response.data.response.data.balance);
      console.log('Status:', response.data.response.status);
      
      // Check if transaction was recorded
      const { exec } = require('child_process');
      exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT id, external_reference, amount, created_at FROM transactions WHERE external_reference = '${tx.transaction_id}';"`, (error, stdout, stderr) => {
        if (error) {
          console.error('Database check error:', error);
          return;
        }
        if (stdout.includes('(0 rows)')) {
          console.log('❌ Transaction NOT recorded in database');
        } else {
          console.log('✅ Transaction recorded in database');
        }
      });
      
      // Wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error with transaction ${tx.transaction_id}:`, error.response ? error.response.data : error.message);
    }
  }
  
  // Final balance check
  console.log('\n--- Final Balance Check ---');
  const { exec } = require('child_process');
  exec('docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT balance FROM user_category_balances WHERE user_id = 48;"', (error, stdout, stderr) => {
    if (error) {
      console.error('Balance check error:', error);
      return;
    }
    console.log('Current balance:', stdout.trim());
  });
}

testRapidBets(); 