const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for player10's recent bet
const testData = {
  user_id: 31, // player10's user ID
  transaction_id: '2220025', // Recent bet transaction ID
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

// Test cancel callback
async function testCancelCallback() {
  try {
    const timestamp = testData.request_timestamp.toString();
    const hash = generateHash('cancel', timestamp);
    
    const requestData = {
      command: 'cancel',
      data: {
        user_id: testData.user_id,
        transaction_id: testData.transaction_id
      },
      request_timestamp: timestamp.toString(),
      hash: hash
    };

    console.log('Testing Cancel Callback for player10...');
    console.log('Request Data:', JSON.stringify(requestData, null, 2));
    
    const authHeader = generateAuthHeader('cancel');
    const response = await axios.post(`${BASE_URL}/innova/`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': authHeader
      },
      timeout: 10000
    });

    console.log('✅ Cancel Callback Response:');
    console.log('Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Cancel Callback Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Check balance before and after
async function checkBalance() {
  try {
    console.log('\n📊 Checking player10 balance...');
    
    // You would need to implement this based on your API structure
    // For now, we'll just log that we need to check the database
    console.log('Balance check would be done via database query');
    
  } catch (error) {
    console.error('❌ Balance check error:', error.message);
  }
}

// Main test function
async function runTest() {
  console.log('🚀 Starting Cancel Callback Test for player10\n');
  
  try {
    // Check initial balance
    await checkBalance();
    
    // Test cancel callback
    const result = await testCancelCallback();
    
    // Check balance after cancel
    console.log('\n📊 Checking balance after cancel...');
    await checkBalance();
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
runTest(); 