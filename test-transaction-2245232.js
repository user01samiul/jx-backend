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

async function testTransaction2245232() {
  const timestamp = '2025-08-11 15:12:29';
  const transaction_id = '2245232';
  const token = 'df230b089b9839d5769e022bff6f6a39'; // Token from the original request
  
  const requestData = {
    command: 'changebalance',
    data: {
      transaction_type: 'BET',
      reason: 'SPIN',
      amount: 3,
      currency_code: 'USD',
      transaction_id: transaction_id,
      transaction_timestamp: timestamp,
      round_id: 1355097,
      round_finished: false,
      game_id: 15,
      user_id: '48',
      token: token,
      context: {
        reason: 'SPIN',
        urid: 'WT0811151229329mis99',
        history_id: '2-299189'
      }
    },
    request_timestamp: timestamp,
    hash: generateRequestHash('changebalance', timestamp)
  };

  const headers = {
    'X-Authorization': generateXAuthorization('changebalance'),
    'X-Operator-Id': 'thinkcode_stg',
    'X-TT-Operator-Id': 'thinkcode_stg',
    'X-Req-Id': 'WT0811151229329mis99',
    'Content-Type': 'application/json'
  };

  try {
    console.log('Testing transaction 2245232 (BET 3.00 USD)...');
    console.log('Request data:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/changebalance`, requestData, { headers });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Check if transaction was recorded
    console.log('\n--- Checking database for transaction ---');
    const { exec } = require('child_process');
    exec('docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT id, user_id, type, amount, balance_before, balance_after, external_reference, created_at FROM transactions WHERE external_reference = \'2245232\';"', (error, stdout, stderr) => {
      if (error) {
        console.error('Database check error:', error);
        return;
      }
      console.log('Database result:', stdout);
    });
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testTransaction2245232(); 