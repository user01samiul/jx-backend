/**
 * Test Campaigns API on different Innova hosts
 */

const crypto = require('crypto');
const axios = require('axios');

const CONFIG = {
  operatorId: 'thinkcode',
  secretKey: '2aZWQ93V8aT1sKrA'
};

// Generate authorization hash
function generateAuthHash() {
  const payload = 'campaigns' + CONFIG.operatorId + CONFIG.secretKey;
  return crypto.createHash('sha1').update(payload).digest('hex');
}

const headers = {
  'X-Authorization': generateAuthHash(),
  'X-Operator-Id': CONFIG.operatorId,
  'Content-Type': 'application/json'
};

// Test different hosts
const hosts = [
  'https://ttlive.me',
  'https://air.gameprovider.org',
  'https://gamerun-eu.gaminguniverse.fun',
  'https://backend.jackpotx.net'
];

async function testHost(baseUrl) {
  console.log(`\nTesting: ${baseUrl}`);
  console.log('-'.repeat(60));

  try {
    const response = await axios.get(
      `${baseUrl}/api/generic/campaigns/vendors`,
      { headers, timeout: 5000 }
    );
    console.log(`✅ SUCCESS - Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    const status = error.response?.status || 'timeout/network error';
    console.log(`❌ FAILED - Status: ${status}`);
    if (error.response?.data) {
      const data = typeof error.response.data === 'string'
        ? error.response.data.substring(0, 100) + '...'
        : JSON.stringify(error.response.data, null, 2);
      console.log('Response:', data);
    } else {
      console.log('Error:', error.message);
    }
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('TESTING CAMPAIGNS API ON DIFFERENT HOSTS');
  console.log('='.repeat(60));
  console.log('Auth Hash:', generateAuthHash());
  console.log('Operator ID:', CONFIG.operatorId);

  for (const host of hosts) {
    const success = await testHost(host);
    if (success) {
      console.log('\n🎉 FOUND WORKING HOST:', host);
      break;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
