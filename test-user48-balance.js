const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const BASE_URL = 'http://localhost:3000/innova';
const TEST_USER_ID = 48; // player50
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

async function testUser48Balance() {
  try {
    console.log('🧪 Testing balance for user 48 (player50)...');
    
    // Check balance
    console.log('\n📊 Checking balance...');
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const hash = generateHash('balance', timestamp);
    
    const requestData = {
      command: 'balance',
      request_timestamp: timestamp,
      hash: hash,
      data: {
        user_id: TEST_USER_ID.toString(),
        currency_code: 'USD'
      }
    };
    
    console.log('Request:', JSON.stringify(requestData, null, 2));
    
    const authHeader = generateAuthHeader('balance');
    const response = await axios.post(BASE_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': authHeader
      }
    });
    
    console.log('\nResponse:', JSON.stringify(response.data, null, 2));
    
    if (response.data.response && response.data.response.data && response.data.response.data.balance !== undefined) {
      console.log(`\n✅ Balance retrieved: $${response.data.response.data.balance}`);
    } else {
      console.log('\n❌ Balance not retrieved properly');
    }
    
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
testUser48Balance()
  .then(success => {
    console.log('\n🏁 Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 