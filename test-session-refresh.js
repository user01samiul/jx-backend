#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const API_BASE_URL = 'https://backend.jackpotx.net';
const OPERATOR_ID = 'thinkcode_stg';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test user data
const testUser = {
  user_id: '48',
  token: '78d0de2e8724b03a0ec34c869e44ceae',
  game_id: 4
};

// Generate X-Authorization header
function generateXAuthorization(command) {
  return crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
}

// Generate request hash
function generateRequestHash(command, requestTimestamp) {
  return crypto.createHash('sha1').update(command + requestTimestamp + SECRET_KEY).digest('hex');
}

// Test authenticate endpoint
async function testAuthenticate() {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  const authData = {
    command: 'authenticate',
    data: {
      token: testUser.token,
      game_id: testUser.game_id
    },
    request_timestamp: timestamp,
    hash: generateRequestHash('authenticate', timestamp)
  };

  try {
    const xAuth = generateXAuthorization('authenticate');
    
    console.log('🔄 Testing Authentication...');
    const response = await axios.post(`${API_BASE_URL}/api/innova/authenticate`, authData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': xAuth,
        'X-Operator-Id': OPERATOR_ID
      },
      timeout: 10000
    });

    console.log('✅ Authentication successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Test balance endpoint
async function testBalance() {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  const balanceData = {
    command: 'balance',
    data: {
      token: testUser.token,
      game_id: testUser.game_id
    },
    request_timestamp: timestamp,
    hash: generateRequestHash('balance', timestamp)
  };

  try {
    const xAuth = generateXAuthorization('balance');
    
    console.log('💰 Testing Balance...');
    const response = await axios.post(`${API_BASE_URL}/api/innova/balance`, balanceData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': xAuth,
        'X-Operator-Id': OPERATOR_ID
      },
      timeout: 10000
    });

    console.log('✅ Balance check successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Main test function
async function testSessionRefresh() {
  console.log('🚀 Session Refresh Test');
  console.log('========================');
  console.log(`User ID: ${testUser.user_id}`);
  console.log(`Game ID: ${testUser.game_id}`);
  console.log(`Token: ${testUser.token.substring(0, 10)}...`);
  console.log('');

  // Test authentication
  const authResult = await testAuthenticate();
  if (!authResult) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  console.log('');
  
  // Test balance
  const balanceResult = await testBalance();
  if (!balanceResult) {
    console.log('❌ Balance check failed');
    return;
  }

  console.log('');
  console.log('🎉 Session refresh test completed successfully!');
  console.log('The API is working correctly. The session expiration error');
  console.log('is likely coming from the game provider\'s side.');
}

// Run the test
testSessionRefresh().catch(console.error); 