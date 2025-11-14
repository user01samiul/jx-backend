const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for player10 (user_id: 31)
const testData = {
  user_id: 31,
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

// Test balance method multiple times
async function debugBalance() {
  try {
    console.log('🔍 **DEBUGGING BALANCE ISSUE**');
    console.log('==============================');
    
    for (let i = 1; i <= 5; i++) {
      console.log(`\n📊 **BALANCE CHECK ${i}**`);
      
      // Update timestamp for each request
      testData.request_timestamp = Math.floor(Date.now() / 1000);
      
      const balancePayload = {
        command: 'balance',
        data: {
          user_id: testData.user_id.toString(),
          token: '528597282ee9f25466991e0166f2ec02'
        },
        request_timestamp: testData.request_timestamp.toString(),
        hash: generateHash('balance', testData.request_timestamp)
      };

      const balanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balancePayload, {
        headers: { 'X-Authorization': generateAuthHeader('balance') }
      });

      const balance = balanceResponse.data.response.data.balance;
      console.log(`💰 Balance ${i}: $${balance}`);
      
      // Wait 1 second between checks
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎯 **BALANCE DEBUG COMPLETED**');
    
  } catch (error) {
    console.error('❌ Balance Debug Error:', error.response?.data || error.message);
  }
}

// Run the debug
debugBalance().catch(console.error); 