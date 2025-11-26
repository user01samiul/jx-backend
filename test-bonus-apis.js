const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Get JWT token from your actual user login
// Replace this with a valid JWT token for testing
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // You'll need to provide this

async function testBonusAPIs() {
  try {
    console.log('🧪 Testing Bonus APIs...\n');

    // Test 1: Get Bonus Stats
    console.log('📊 Test 1: GET /api/bonus/stats');
    const statsResponse = await axios.get(`${BASE_URL}/api/bonus/stats`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    console.log('✅ Stats Response:');
    console.log(JSON.stringify(statsResponse.data, null, 2));
    console.log('\n---\n');

    // Test 2: Get Bonus Transactions
    console.log('💰 Test 2: GET /api/bonus/transactions');
    const transactionsResponse = await axios.get(`${BASE_URL}/api/bonus/transactions?limit=10&offset=0`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    console.log('✅ Transactions Response:');
    console.log(JSON.stringify(transactionsResponse.data, null, 2));
    console.log('\n---\n');

    // Test 3: Get Bonus Wallet
    console.log('👛 Test 3: GET /api/bonus/wallet');
    const walletResponse = await axios.get(`${BASE_URL}/api/bonus/wallet`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    console.log('✅ Wallet Response:');
    console.log(JSON.stringify(walletResponse.data, null, 2));
    console.log('\n---\n');

    console.log('✨ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Instructions
console.log(`
╔═══════════════════════════════════════════════════════════╗
║  BONUS API TEST SCRIPT                                    ║
╚═══════════════════════════════════════════════════════════╝

To use this script:

1. First, login to get a JWT token:

   curl -X POST http://localhost:3001/api/auth/login \\
     -H "Content-Type: application/json" \\
     -d '{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD"}'

2. Copy the "accessToken" from the response

3. Edit this file and replace JWT_TOKEN with your actual token

4. Run: node test-bonus-apis.js

---

Alternatively, run this one-liner (replace USERNAME and PASSWORD):

node -e "
const axios = require('axios');
axios.post('http://localhost:3001/api/auth/login', {
  username: 'YOUR_USERNAME',
  password: 'YOUR_PASSWORD'
}).then(r => {
  const token = r.data.accessToken;
  console.log('Token:', token);

  // Test Stats
  axios.get('http://localhost:3001/api/bonus/stats', {
    headers: { Authorization: 'Bearer ' + token }
  }).then(r => console.log('Stats:', JSON.stringify(r.data, null, 2)))
  .catch(e => console.error('Stats Error:', e.response?.data));

  // Test Transactions
  axios.get('http://localhost:3001/api/bonus/transactions', {
    headers: { Authorization: 'Bearer ' + token }
  }).then(r => console.log('Transactions:', JSON.stringify(r.data, null, 2)))
  .catch(e => console.error('Transactions Error:', e.response?.data));
}).catch(e => console.error('Login Error:', e.response?.data));
"

`);

// Uncomment this line after setting JWT_TOKEN
// testBonusAPIs();
