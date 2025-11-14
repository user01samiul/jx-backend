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

// Check main wallet balance via API
async function checkMainWalletBalance() {
  try {
    console.log('🔍 **CHECKING MAIN WALLET BALANCE**');
    
    const response = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMxLCJ1c2VybmFtZSI6InBsYXllcjEwIiwicm9sZSI6IlBsYXllciIsInJvbGVJZCI6MiwiaWF0IjoxNzU0NDY5OTkyLCJleHAiOjE3NTQ1NTYzOTJ9.cSpDyPAZGNjMj7552myGMR7l_8DeETHB9-_VZSYx3C4'
      }
    });

    console.log('✅ Main Wallet Response:', JSON.stringify(response.data, null, 2));
    return response.data.balance;
  } catch (error) {
    console.error('❌ Main Wallet Error:', error.response?.data || error.message);
    return null;
  }
}

// Check category balances via API
async function checkCategoryBalances() {
  try {
    console.log('🔍 **CHECKING CATEGORY BALANCES**');
    
    const response = await axios.get(`${BASE_URL}/api/user/category-balances`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMxLCJ1c2VybmFtZSI6InBsYXllcjEwIiwicm9sZSI6IlBsYXllciIsInJvbGVJZCI6MiwiaWF0IjoxNzU0NDY5OTkyLCJleHAiOjE3NTQ1NTYzOTJ9.cSpDyPAZGNjMj7552myGMR7l_8DeETHB9-_VZSYx3C4'
      }
    });

    console.log('✅ Category Balances Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Category Balances Error:', error.response?.data || error.message);
    return null;
  }
}

// Check provider balance (what games see)
async function checkProviderBalance() {
  try {
    console.log('🔍 **CHECKING PROVIDER BALANCE (What Games See)**');

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

    console.log('✅ Provider Balance Response:', JSON.stringify(balanceResponse.data, null, 2));
    return balanceResponse.data.response.data.balance;
  } catch (error) {
    console.error('❌ Provider Balance Error:', error.response?.data || error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('💰 **CURRENT BALANCE ANALYSIS**');
  console.log('================================');

  // Check main wallet
  const mainWallet = await checkMainWalletBalance();
  
  // Check category balances
  const categoryBalances = await checkCategoryBalances();
  
  // Check provider balance
  const providerBalance = await checkProviderBalance();

  console.log('\n📊 **SUMMARY**');
  console.log('==============');
  
  if (mainWallet !== null) {
    console.log(`💰 Main Wallet Balance: $${mainWallet}`);
  }
  
  if (categoryBalances !== null && categoryBalances.data) {
    console.log('💰 Category Balances:');
    categoryBalances.data.forEach(cat => {
      console.log(`   - ${cat.category}: $${cat.balance}`);
    });
  }
  
  if (providerBalance !== null) {
    console.log(`💰 Provider Balance (Games See): $${providerBalance}`);
  }

  console.log('\n🎯 **EXPLANATION**');
  console.log('==================');
  console.log('• Main Wallet: Your actual money');
  console.log('• Category Balance: Money transferred to specific game category');
  console.log('• Provider Balance: What games see (usually category balance)');
  console.log('• The $1500 you see is your accumulated gaming wins in the category!');
}

// Run the check
main().catch(console.error); 