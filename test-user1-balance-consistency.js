const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data for user 1
const testData = {
  user_id: 1,
  game_id: 18,
  round_id: 1349610,
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

// Test balance method to get current balance
async function getCurrentBalance() {
  try {
    console.log('💰 Getting current balance...');
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hash = generateHash('balance', timestamp);
    
    const requestData = {
      command: 'balance',
      data: {
        token: 'f865ea015d587a4efae822cba8e30759',
        user_id: testData.user_id,
        currency_code: 'USD'
      },
      request_timestamp: timestamp,
      hash: hash
    };

    const authHeader = generateAuthHeader('balance');
    const response = await axios.post(`${BASE_URL}/innova/`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': authHeader
      },
      timeout: 10000
    });

    const balance = response.data?.response?.data?.balance;
    console.log(`💰 Current Balance: $${balance}`);
    return balance;
    
  } catch (error) {
    console.error('❌ Balance check error:', error.message);
    return null;
  }
}

// Test cancel method for a specific transaction
async function testCancelTransaction(transactionId) {
  try {
    console.log(`\n🧪 Testing Cancel for Transaction: ${transactionId}`);
    
    // Get balance before cancellation
    const balanceBefore = await getCurrentBalance();
    if (balanceBefore === null) {
      console.log('❌ Cannot proceed - balance check failed');
      return null;
    }
    
    console.log(`💰 Balance Before Cancel: $${balanceBefore}`);
    
    // Perform cancellation
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hash = generateHash('cancel', timestamp);
    
    const requestData = {
      command: 'cancel',
      data: {
        user_id: testData.user_id,
        transaction_id: transactionId,
        round_id: testData.round_id,
        round_finished: true,
        game_id: testData.game_id
      },
      request_timestamp: timestamp,
      hash: hash
    };

    console.log('📤 Cancel Request Data:', JSON.stringify(requestData, null, 2));
    
    const authHeader = generateAuthHeader('cancel');
    const response = await axios.post(`${BASE_URL}/innova/`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': authHeader
      },
      timeout: 15000
    });

    console.log('✅ Cancel Response:');
    console.log('Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    const isError = response.data?.response?.status === 'ERROR';
    const cancelBalance = response.data?.response?.data?.balance;
    
    console.log(`💰 Cancel Method Balance: $${cancelBalance}`);
    console.log(`❌ Is Error: ${isError}`);
    
    if (isError) {
      console.log(`❌ Cancel failed: ${response.data?.response?.data?.error_message}`);
      return {
        success: false,
        error: response.data?.response?.data?.error_message,
        balanceBefore: balanceBefore,
        balanceAfter: null,
        adjustment: null
      };
    }
    
    // Wait a moment for database to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get balance after cancellation
    const balanceAfter = await getCurrentBalance();
    console.log(`💰 Balance After Cancel: $${balanceAfter}`);
    
    // Calculate actual adjustment
    const actualAdjustment = balanceAfter - balanceBefore;
    console.log(`💰 Actual Balance Adjustment: $${actualAdjustment.toFixed(2)}`);
    
    // Check if cancel response balance matches actual balance
    const balanceMatches = Math.abs(cancelBalance - balanceAfter) < 0.01;
    console.log(`✅ Cancel Response Balance Matches Actual: ${balanceMatches ? 'YES' : 'NO'}`);
    
    return {
      success: true,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      cancelResponseBalance: cancelBalance,
      actualAdjustment: actualAdjustment,
      balanceMatches: balanceMatches,
      transactionId: transactionId
    };
    
  } catch (error) {
    console.error('❌ Cancel test error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test balance consistency multiple times
async function testBalanceConsistency() {
  console.log('\n🔍 Testing Balance Consistency...');
  
  const balances = [];
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Balance Call ${i} ---`);
    const balance = await getCurrentBalance();
    if (balance !== null) {
      balances.push(balance);
      console.log(`Balance ${i}: $${balance}`);
    }
    
    // Wait between calls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Check consistency
  const uniqueBalances = [...new Set(balances)];
  const isConsistent = uniqueBalances.length === 1;
  
  console.log('\n📊 Balance Consistency Check:');
  console.log(`All balances: [${balances.join(', ')}]`);
  console.log(`Unique balances: [${uniqueBalances.join(', ')}]`);
  console.log(`Consistent: ${isConsistent ? '✅ YES' : '❌ NO'}`);
  
  return {
    balances: balances,
    uniqueBalances: uniqueBalances,
    isConsistent: isConsistent
  };
}

// Main test function
async function runUser1BalanceTest() {
  console.log('🚀 Starting User 1 Balance Consistency Test');
  console.log('📋 Testing recent bet/win transactions and balance consistency\n');
  
  try {
    // Test balance consistency first
    const balanceConsistency = await testBalanceConsistency();
    
    // Test cancel for recent transactions
    const recentTransactions = ['2234874', '2234873', '2234872', '2234871'];
    const cancelResults = [];
    
    console.log('\n🧪 Testing Cancel for Recent Transactions...');
    
    for (const transactionId of recentTransactions) {
      console.log(`\n--- Testing Transaction: ${transactionId} ---`);
      const result = await testCancelTransaction(transactionId);
      
      cancelResults.push({
        transactionId: transactionId,
        ...result
      });
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Analysis
    console.log('\n📊 Test Analysis:');
    console.log('================');
    
    const successfulCancels = cancelResults.filter(r => r.success);
    const failedCancels = cancelResults.filter(r => !r.success);
    
    console.log(`✅ Successful cancels: ${successfulCancels.length}/${cancelResults.length}`);
    console.log(`❌ Failed cancels: ${failedCancels.length}/${cancelResults.length}`);
    
    if (successfulCancels.length > 0) {
      console.log('\n📋 Successful Cancel Operations:');
      successfulCancels.forEach(result => {
        console.log(`\n--- Transaction ${result.transactionId} ---`);
        console.log(`💰 Balance Before: $${result.balanceBefore}`);
        console.log(`💰 Balance After: $${result.balanceAfter}`);
        console.log(`💰 Actual Adjustment: $${result.actualAdjustment.toFixed(2)}`);
        console.log(`✅ Balance Consistency: ${result.balanceMatches ? 'YES' : 'NO'}`);
      });
    }
    
    if (failedCancels.length > 0) {
      console.log('\n❌ Failed Cancel Operations:');
      failedCancels.forEach(result => {
        console.log(`\n--- Transaction ${result.transactionId} ---`);
        console.log(`❌ Error: ${result.error}`);
      });
    }
    
    // Summary
    console.log('\n🎯 Provider Requirements Check:');
    console.log('================================');
    
    const allBalancesConsistent = successfulCancels.every(r => r.balanceMatches);
    const balanceMethodConsistent = balanceConsistency.isConsistent;
    
    console.log(`✅ Balance Method Consistency: ${balanceMethodConsistent ? 'YES' : 'NO'}`);
    console.log(`✅ Cancel Response Balance Consistency: ${allBalancesConsistent ? 'YES' : 'NO'}`);
    
    console.log(`\n📊 Overall Results:`);
    console.log(`- Balance consistency across multiple calls: ${balanceMethodConsistent ? '✅ YES' : '❌ NO'}`);
    console.log(`- Cancel response balance matches actual balance: ${allBalancesConsistent ? '✅ YES' : '❌ NO'}`);
    
    if (balanceMethodConsistent && allBalancesConsistent) {
      console.log('\n🎉 SUCCESS: Balance consistency is working correctly!');
      console.log('- ✅ Balance method returns consistent values');
      console.log('- ✅ Cancel method returns accurate balance');
      console.log('- ✅ No balance discrepancies detected');
    } else {
      console.log('\n⚠️  ISSUES FOUND: Some balance consistency issues detected');
    }
    
    // Check database state
    console.log('\n📊 Database State Summary:');
    console.log('==========================');
    console.log(`- Current balance from API: $${balanceConsistency.balances[0] || 'N/A'}`);
    console.log(`- Balance consistency: ${balanceMethodConsistent ? '✅ GOOD' : '❌ POOR'}`);
    console.log(`- Cancel functionality: ${successfulCancels.length > 0 ? '✅ WORKING' : '❌ NOT TESTED'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
runUser1BalanceTest(); 