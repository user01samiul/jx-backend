const axios = require('axios');
const crypto = require('crypto');

const config = {
  api_url: 'https://sp-int-9cr.6579883.com',
  api_version: '1.0.0',
  username: 'jackpotx',
  password: 'NwFhr_KsyqpJwi62_Bc',
  security_hash: '737e36e0-6d0b-4a67-aa50-2c448fe319f3'
};

console.log('\n====== IGPX AUTHENTICATION TEST (WITH API VERSION) ======\n');

// Test with correct API path including version
const authUrl = `${config.api_url}/${config.api_version}/auth`;
console.log(`Testing: ${authUrl}`);
console.log(`Username: ${config.username}`);
console.log(`Password: ${config.password.substring(0, 5)}...`);
console.log('');

axios.post(authUrl, {
  username: config.username,
  password: config.password
}, {
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'JackpotX-Backend/1.0'
  }
})
.then(response => {
  console.log('✓✓✓ AUTHENTICATION SUCCESSFUL! ✓✓✓\n');
  console.log('Response:');
  console.log(JSON.stringify(response.data, null, 2));

  if (response.data.token) {
    console.log('\n✓ Token received:', response.data.token.substring(0, 30) + '...');
    console.log('✓ Expires in:', response.data.expires_in, 'seconds');

    // Test session creation
    console.log('\n====== TESTING SESSION CREATION ======\n');
    const sessionUrl = `${config.api_url}/${config.api_version}/start-session`;
    console.log(`URL: ${sessionUrl}`);

    return axios.post(sessionUrl, {
      user_id: '1',
      currency: 'USD',
      lang: 'en'
    }, {
      headers: {
        'Authorization': `Bearer ${response.data.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'JackpotX-Backend/1.0'
      }
    });
  }
})
.then(response => {
  if (response) {
    console.log('✓✓✓ SESSION CREATION SUCCESSFUL! ✓✓✓\n');
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.url) {
      console.log('\n✓ Sportsbook URL:', response.data.url);
      console.log('\n====== INTEGRATION IS WORKING! ======\n');
      console.log('The IGPX Sportsbook integration is FULLY FUNCTIONAL!');
      console.log('Users can now access the sportsbook via the iframe URL.');
    }
  }
})
.catch(error => {
  console.log('✗ ERROR:\n');
  console.log('Status:', error.response?.status || 'No response');
  console.log('Message:', error.message);

  if (error.response?.status === 403) {
    console.log('\n403 Forbidden - Possible causes:');
    console.log('1. IP not whitelisted with IGPX');
    console.log('2. Account "jackpotx" is inactive/disabled');
    console.log('3. Credentials expired');
    console.log('\nAction: Contact IGPX support to verify account status');
  } else if (error.response?.status === 401) {
    console.log('\n401 Unauthorized - Invalid credentials');
    console.log('Action: Verify username and password with IGPX');
  } else if (error.response?.status === 404) {
    console.log('\n404 Not Found - Incorrect API endpoint or version');
    console.log('Action: Verify API URL and version with IGPX');
  }

  if (error.response?.data) {
    console.log('\nResponse data:');
    console.log(typeof error.response.data === 'string'
      ? error.response.data.substring(0, 500)
      : JSON.stringify(error.response.data, null, 2));
  }
})
.finally(() => {
  console.log('\n====== TEST COMPLETE ======\n');
});
