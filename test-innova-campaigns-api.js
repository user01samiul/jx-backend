/**
 * Test script to directly call Innova Campaigns API
 * This will help us see the exact response and identify any issues
 */

const crypto = require('crypto');
const axios = require('axios');

// Configuration from .env
const CONFIG = {
  baseUrl: 'https://ttlive.me',
  operatorId: 'thinkcode',
  secretKey: '2aZWQ93V8aT1sKrA'
};

// Generate authorization hash
function generateAuthHash() {
  const payload = 'campaigns' + CONFIG.operatorId + CONFIG.secretKey;
  return crypto.createHash('sha1').update(payload).digest('hex');
}

// Test function
async function testInnovaAPI() {
  const authHash = generateAuthHash();

  console.log('='.repeat(60));
  console.log('INNOVA CAMPAIGNS API TEST');
  console.log('='.repeat(60));
  console.log('Base URL:', CONFIG.baseUrl);
  console.log('Operator ID:', CONFIG.operatorId);
  console.log('Secret Key:', CONFIG.secretKey);
  console.log('Auth Hash:', authHash);
  console.log('='.repeat(60));
  console.log('');

  const headers = {
    'X-Authorization': authHash,
    'X-Operator-Id': CONFIG.operatorId,
    'Content-Type': 'application/json'
  };

  // Test 1: List Vendors
  console.log('TEST 1: List Vendors');
  console.log('URL: GET', CONFIG.baseUrl + '/api/generic/campaigns/vendors');
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log('');

  try {
    const response = await axios.get(
      CONFIG.baseUrl + '/api/generic/campaigns/vendors',
      { headers }
    );
    console.log('✅ SUCCESS - Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ ERROR - Status:', error.response?.status || 'No response');
    console.log('Error Message:', error.message);
    if (error.response) {
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
      console.log('Response Headers:', JSON.stringify(error.response.headers, null, 2));
    }
  }

  console.log('');
  console.log('-'.repeat(60));
  console.log('');

  // Test 2: Get Game Limits
  console.log('TEST 2: Get Game Limits');
  console.log('URL: GET', CONFIG.baseUrl + '/api/generic/campaigns/vendors/limits?vendors=pragmatic&currencies=USD');
  console.log('');

  try {
    const response = await axios.get(
      CONFIG.baseUrl + '/api/generic/campaigns/vendors/limits',
      {
        headers,
        params: { vendors: 'pragmatic', currencies: 'USD' }
      }
    );
    console.log('✅ SUCCESS - Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ ERROR - Status:', error.response?.status || 'No response');
    console.log('Error Message:', error.message);
    if (error.response) {
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('');
  console.log('-'.repeat(60));
  console.log('');

  // Test 3: List Campaigns
  console.log('TEST 3: List Campaigns');
  console.log('URL: GET', CONFIG.baseUrl + '/api/generic/campaigns/list');
  console.log('');

  try {
    const response = await axios.get(
      CONFIG.baseUrl + '/api/generic/campaigns/list',
      { headers }
    );
    console.log('✅ SUCCESS - Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ ERROR - Status:', error.response?.status || 'No response');
    console.log('Error Message:', error.message);
    if (error.response) {
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

// Run test
testInnovaAPI().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
