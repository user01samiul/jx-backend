const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';

// Test data
const testData = {
  user_id: 31,
  game_id: 2,
  round_id: 1344236,
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
        token: '576b4ddd96ea60af3c3c3ab6a3922bd3',
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

// Test cancel method and track balance changes
async function testCancelWithBalanceTracking(transactionId, expectedType, expectedAmount) {
  try {
    console.log(`\n🧪 Testing Cancel for Transaction: ${transactionId}`);
    console.log(`📋 Expected Type: ${expectedType}`);
    console.log(`📋 Expected Amount: $${expectedAmount}`);
    
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
    
    // Verify the adjustment logic
    let expectedAdjustment = 0;
    if (expectedType === 'bet') {
      expectedAdjustment = expectedAmount; // Should ADD balance
    } else if (expectedType === 'win') {
      expectedAdjustment = -expectedAmount; // Should DEDUCT balance
    }
    
    console.log(`📋 Expected Adjustment: $${expectedAdjustment.toFixed(2)}`);
    
    // Check if adjustment matches expected
    const adjustmentMatches = Math.abs(actualAdjustment - expectedAdjustment) < 0.01;
    console.log(`✅ Adjustment Matches Expected: ${adjustmentMatches ? 'YES' : 'NO'}`);
    
    // Check if cancel response balance matches actual balance
    const balanceMatches = Math.abs(cancelBalance - balanceAfter) < 0.01;
    console.log(`✅ Cancel Response Balance Matches Actual: ${balanceMatches ? 'YES' : 'NO'}`);
    
    return {
      success: true,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      cancelResponseBalance: cancelBalance,
      actualAdjustment: actualAdjustment,
      expectedAdjustment: expectedAdjustment,
      adjustmentMatches: adjustmentMatches,
      balanceMatches: balanceMatches,
      transactionType: expectedType,
      transactionAmount: expectedAmount
    };
    
  } catch (error) {
    console.error('❌ Cancel test error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test multiple transactions to find valid ones
async function testMultipleTransactions() {
  const testCases = [
    {
      transactionId: '2224092',
      expectedType: 'bet',
      expectedAmount: 0.15
    },
    {
      transactionId: '2224093',
      expectedType: 'bet',
      expectedAmount: 0.15
    },
    {
      transactionId: '2224094',
      expectedType: 'win',
      expectedAmount: 0.25
    },
    {
      transactionId: '2224095',
      expectedType: 'win',
      expectedAmount: 0.25
    },
    {
      transactionId: '2224096',
      expectedType: 'bet',
      expectedAmount: 0.15
    },
    {
      transactionId: '2224097',
      expectedType: 'win',
      expectedAmount: 0.25
    }
  ];
  
  console.log('🔍 Testing multiple transactions to verify balance adjustment logic...\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n--- Testing Transaction: ${testCase.transactionId} ---`);
    const result = await testCancelWithBalanceTracking(
      testCase.transactionId,
      testCase.expectedType,
      testCase.expectedAmount
    );
    
    results.push({
      transactionId: testCase.transactionId,
      expectedType: testCase.expectedType,
      expectedAmount: testCase.expectedAmount,
      ...result
    });
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  return results;
}

// Main test function
async function runCancelBalanceAdjustmentTest() {
  console.log('🚀 Starting Cancel Balance Adjustment Test');
  console.log('📋 Verifying Cancel Logic: BET = Add Balance, WIN = Deduct Balance\n');
  
  try {
    const results = await testMultipleTransactions();
    
    // Analysis
    console.log('\n📊 Test Analysis:');
    console.log('================');
    
    const successfulTests = results.filter(r => r.success);
    const failedTests = results.filter(r => !r.success);
    
    console.log(`✅ Successful tests: ${successfulTests.length}/${results.length}`);
    console.log(`❌ Failed tests: ${failedTests.length}/${results.length}`);
    
    if (successfulTests.length > 0) {
      console.log('\n📋 Successful Cancel Operations:');
      successfulTests.forEach(result => {
        console.log(`\n--- Transaction ${result.transactionId} (${result.transactionType}) ---`);
        console.log(`💰 Balance Before: $${result.balanceBefore}`);
        console.log(`💰 Balance After: $${result.balanceAfter}`);
        console.log(`💰 Actual Adjustment: $${result.actualAdjustment.toFixed(2)}`);
        console.log(`📋 Expected Adjustment: $${result.expectedAdjustment.toFixed(2)}`);
        console.log(`✅ Adjustment Correct: ${result.adjustmentMatches ? 'YES' : 'NO'}`);
        console.log(`✅ Balance Consistency: ${result.balanceMatches ? 'YES' : 'NO'}`);
        
        // Verify provider requirements
        if (result.transactionType === 'bet') {
          const isCorrect = result.actualAdjustment > 0;
          console.log(`🎯 BET Cancel = Add Balance: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
        } else if (result.transactionType === 'win') {
          const isCorrect = result.actualAdjustment < 0;
          console.log(`🎯 WIN Cancel = Deduct Balance: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
        }
      });
    }
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Cancel Operations:');
      failedTests.forEach(result => {
        console.log(`\n--- Transaction ${result.transactionId} ---`);
        console.log(`❌ Error: ${result.error}`);
      });
    }
    
    // Summary
    console.log('\n🎯 Provider Requirements Check:');
    console.log('================================');
    
    const correctBetCancels = successfulTests.filter(r => 
      r.transactionType === 'bet' && r.actualAdjustment > 0
    ).length;
    
    const correctWinCancels = successfulTests.filter(r => 
      r.transactionType === 'win' && r.actualAdjustment < 0
    ).length;
    
    console.log(`✅ BET Cancellations (Add Balance): ${correctBetCancels}/${successfulTests.filter(r => r.transactionType === 'bet').length}`);
    console.log(`✅ WIN Cancellations (Deduct Balance): ${correctWinCancels}/${successfulTests.filter(r => r.transactionType === 'win').length}`);
    
    const allAdjustmentsCorrect = successfulTests.every(r => r.adjustmentMatches);
    const allBalancesConsistent = successfulTests.every(r => r.balanceMatches);
    
    console.log(`\n📊 Overall Results:`);
    console.log(`- Balance Adjustments Correct: ${allAdjustmentsCorrect ? '✅ YES' : '❌ NO'}`);
    console.log(`- Balance Consistency: ${allBalancesConsistent ? '✅ YES' : '❌ NO'}`);
    
    if (allAdjustmentsCorrect && allBalancesConsistent) {
      console.log('\n🎉 SUCCESS: Cancel logic is working correctly according to provider requirements!');
      console.log('- ✅ Cancel BET = Add balance');
      console.log('- ✅ Cancel WIN = Deduct balance');
      console.log('- ✅ Balance consistency maintained');
    } else {
      console.log('\n⚠️  ISSUES FOUND: Some aspects of cancel logic need attention');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
runCancelBalanceAdjustmentTest(); 