const axios = require('axios');

// Test different authentication approaches
const config = {
  api_url: 'https://sp-int-9cr.6579883.com',
  username: 'jackpotx',
  password: 'NwFhr_KsyqpJwi62_Bc',
  security_hash: '737e36e0-6d0b-4a67-aa50-2c448fe319f3'
};

console.log('\n====== IGPX AUTHENTICATION TROUBLESHOOTING ======\n');
console.log('Testing various authentication methods...\n');

// Test 1: POST with JSON body (current method)
console.log('Test 1: POST /auth with JSON body');
axios.post(`${config.api_url}/auth`, {
  username: config.username,
  password: config.password
}, {
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'JackpotX-Backend/1.0'
  }
})
.then(response => {
  console.log('✓ SUCCESS with JSON body');
  console.log('Response:', response.data);
})
.catch(error => {
  console.log('✗ FAILED with JSON body');
  console.log('Status:', error.response?.status || 'No response');
  console.log('Error:', error.message);
  console.log('');

  // Test 2: Try with form-urlencoded
  console.log('Test 2: POST /auth with form-urlencoded');
  const params = new URLSearchParams();
  params.append('username', config.username);
  params.append('password', config.password);

  return axios.post(`${config.api_url}/auth`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'JackpotX-Backend/1.0'
    }
  });
})
.then(response => {
  if (response) {
    console.log('✓ SUCCESS with form-urlencoded');
    console.log('Response:', response.data);
  }
})
.catch(error => {
  console.log('✗ FAILED with form-urlencoded');
  console.log('Status:', error.response?.status || 'No response');
  console.log('Error:', error.message);
  console.log('');

  // Test 3: Try with basic auth header
  console.log('Test 3: POST /auth with Basic Authentication header');
  const basicAuth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

  return axios.post(`${config.api_url}/auth`, {}, {
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      'User-Agent': 'JackpotX-Backend/1.0'
    }
  });
})
.then(response => {
  if (response) {
    console.log('✓ SUCCESS with Basic Auth');
    console.log('Response:', response.data);
  }
})
.catch(error => {
  console.log('✗ FAILED with Basic Auth');
  console.log('Status:', error.response?.status || 'No response');
  console.log('Error:', error.message);
  console.log('');

  // Test 4: Try GET instead of POST
  console.log('Test 4: GET /auth with query parameters');
  return axios.get(`${config.api_url}/auth`, {
    params: {
      username: config.username,
      password: config.password
    },
    headers: {
      'User-Agent': 'JackpotX-Backend/1.0'
    }
  });
})
.then(response => {
  if (response) {
    console.log('✓ SUCCESS with GET');
    console.log('Response:', response.data);
  }
})
.catch(error => {
  console.log('✗ FAILED with GET');
  console.log('Status:', error.response?.status || 'No response');
  console.log('Error:', error.message);
  console.log('');
})
.finally(() => {
  console.log('\n====== DIAGNOSIS ======\n');
  console.log('403 Forbidden Error Analysis:');
  console.log('');
  console.log('A 403 error means the server is rejecting your request BEFORE');
  console.log('checking credentials. This is typically caused by:');
  console.log('');
  console.log('1. IP WHITELISTING (Most likely)');
  console.log('   - Your IP is not in IGPX\'s allowed list');
  console.log('   - Contact IGPX to whitelist your server IP');
  console.log('');
  console.log('2. WAF/Cloudflare Protection');
  console.log('   - Cloudflare is blocking the request');
  console.log('   - May need specific User-Agent or headers');
  console.log('');
  console.log('3. Expired/Inactive Account');
  console.log('   - Account "jackpotx" may be disabled');
  console.log('   - Verify with IGPX that account is active');
  console.log('');
  console.log('4. API Endpoint Changed');
  console.log('   - The staging URL may have been deprecated');
  console.log('   - Request current API endpoint from IGPX');
  console.log('');
  console.log('\nRECOMMENDED ACTION:');
  console.log('Contact IGPX support and provide:');
  console.log('- Account username: jackpotx');
  console.log('- Your server IP: ' + (process.env.SERVER_IP || 'Check with: curl ifconfig.me'));
  console.log('- Callback URL: https://backend.jackpotx.net/api/payment/webhook/igpx');
  console.log('- Request API documentation/status');
  console.log('');
});
