const axios = require('axios');
const crypto = require('crypto');

const config = {
  api_endpoint: 'https://sp-int-9cr.6579883.com',
  username: 'jackpotx',
  password: 'NwFhr_KsyqpJwi62_Bc',
  security_hash: '737e36e0-6d0b-4a67-aa50-2c448fe319f3'
};

console.log('\n====== IGPX SPORTSBOOK DIAGNOSTIC TEST ======\n');

// Test 1: API Connectivity
console.log('1. Testing IGPX API Connectivity...');
axios.post(`${config.api_endpoint}/auth`, {
  username: config.username,
  password: config.password
})
.then(response => {
  console.log('   ✓ API is reachable');
  console.log('   ✓ Authentication successful');
  console.log(`   Token: ${response.data.token ? 'Received' : 'Missing'}`);
  console.log(`   Expires in: ${response.data.expires_in} seconds`);

  // Test 2: Session creation
  if (response.data.token) {
    console.log('\n2. Testing Session Creation...');
    return axios.post(`${config.api_endpoint}/start-session`, {
      user_id: '1',
      currency: 'USD',
      lang: 'en'
    }, {
      headers: { 'Authorization': `Bearer ${response.data.token}` }
    });
  }
})
.then(response => {
  if (response) {
    console.log('   ✓ Session creation successful');
    console.log(`   Session URL: ${response.data.url || 'Missing'}`);
  }
})
.catch(error => {
  console.log('   ✗ Error:', error.message);
  if (error.response) {
    console.log('   Status:', error.response.status);
    console.log('   Response:', typeof error.response.data === 'string' ?
      error.response.data.substring(0, 500) + '...' :
      JSON.stringify(error.response.data));
  }
  if (error.code) {
    console.log('   Error Code:', error.code);
  }
})
.finally(() => {
  // Test 3: Webhook signature generation
  console.log('\n3. Testing Webhook Signature Generation...');
  const payload = {
    transaction_id: 'test_123',
    action: 'bet',
    user_id: '1',
    currency: 'USD',
    amount: 10.00
  };

  const signature = crypto
    .createHmac('sha256', config.security_hash)
    .update(JSON.stringify(payload))
    .digest('hex');

  console.log('   ✓ Signature generated successfully');
  console.log('   Signature:', signature);

  console.log('\n====== TEST COMPLETE ======\n');

  console.log('CONFIGURATION SUMMARY:');
  console.log(`- API Endpoint: ${config.api_endpoint}`);
  console.log(`- Username: ${config.username}`);
  console.log(`- Security Hash: ${config.security_hash.substring(0, 20)}...`);
  console.log(`- Database Gateway ID: 15`);
  console.log(`- Webhook URL: https://backend.jackpotx.net/api/payment/webhook/igpx`);
  console.log('\n');
});
