const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
  user_id: 48,
  transaction_id: 'test_cancel_' + Date.now(),
  amount: 10.00
};

// Generate hash for request
function generateHash(data) {
  const crypto = require('crypto');
  const secretKey = 'your_secret_key'; // Replace with actual secret key
  const hashString = data.command + data.request_timestamp + secretKey;
  return crypto.createHash('sha1').update(hashString).digest('hex');
}

// Generate auth header
function generateAuthHeader(command) {
  const crypto = require('crypto');
  const secretKey = 'your_secret_key'; // Replace with actual secret key
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const hashString = command + timestamp + secretKey;
  const hash = crypto.createHash('sha1').update(hashString).digest('hex');
  return hash;
}

async function testCancel() {
  try {
    console.log('=== Testing Cancel Endpoint ===\n');

    // 1. First, create a bet transaction to cancel
    console.log('1. Creating a bet transaction to cancel...');
    const betRequest = {
      command: 'changebalance',
      request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      hash: generateHash({ command: 'changebalance', request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) }),
      data: {
        user_id: testData.user_id,
        transaction_type: 'BET',
        amount: testData.amount,
        currency_code: 'USD',
        transaction_id: testData.transaction_id,
        session_id: 'test_session_' + Date.now(),
        round_id: 'test_round_' + Date.now()
      }
    };

    const betResponse = await axios.post(`${BASE_URL}/innova/changebalance`, betRequest, {
      headers: { 
        'Content-Type': 'application/json',
        'X-Authorization': generateAuthHeader('changebalance')
      }
    });

    console.log('Bet response:', JSON.stringify(betResponse.data, null, 2));
    
    if (betResponse.data.response.status === 'ERROR') {
      console.log('❌ Bet failed, cannot test cancel');
      return;
    }

    console.log('✅ Bet created successfully\n');

    // 2. Now try to cancel the transaction
    console.log('2. Testing cancel endpoint...');
    const cancelRequest = {
      command: 'cancel',
      request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      hash: generateHash({ command: 'cancel', request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) }),
      data: {
        user_id: testData.user_id,
        transaction_id: testData.transaction_id
      }
    };

    const cancelResponse = await axios.post(`${BASE_URL}/innova/cancel`, cancelRequest, {
      headers: { 
        'Content-Type': 'application/json',
        'X-Authorization': generateAuthHeader('cancel')
      }
    });

    console.log('Cancel response:', JSON.stringify(cancelResponse.data, null, 2));
    
    if (cancelResponse.data.response.status === 'OK') {
      console.log('✅ Cancel successful!');
      console.log(`New balance: $${cancelResponse.data.response.data.balance}`);
    } else {
      console.log('❌ Cancel failed:', cancelResponse.data.response.data.error_message);
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testCancel(); 