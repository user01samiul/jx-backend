#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const API_BASE_URL = 'https://backend.jackpotx.net';
const OPERATOR_ID = 'thinkcode_stg';
const SECRET_KEY = '2xk3SrX09oQ71Z3F'; // Actual secret key from environment

// Test configuration
const CONCURRENT_REQUESTS = 10;
const DELAY_BETWEEN_BATCHES = 1000; // 1 second
const TOTAL_BATCHES = 3;

// Test data
const testUser = {
  user_id: '48',
  token: '78d0de2e8724b03a0ec34c869e44ceae', // Valid token from database
  game_id: 4
};

// Generate X-Authorization header (for command validation)
function generateXAuthorization(command) {
  return crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
}

// Generate request hash (for request validation)
function generateRequestHash(command, requestTimestamp) {
  return crypto.createHash('sha1').update(command + requestTimestamp + SECRET_KEY).digest('hex');
}

// Create test transaction data
function createTransactionData(transactionId, amount, transactionType = 'BET') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  const data = {
    command: 'changebalance',
    data: {
      transaction_type: transactionType,
      reason: 'not_provided',
      amount: amount,
      currency_code: 'USD',
      transaction_id: transactionId,
      transaction_timestamp: timestamp,
      round_id: Math.floor(Math.random() * 1000000),
      round_finished: false,
      game_id: testUser.game_id,
      user_id: testUser.user_id,
      token: testUser.token,
      context: {
        reason: 'not_provided',
        urid: `TEST${transactionId}`,
        history_id: `test-${transactionId}`
      }
    },
    request_timestamp: timestamp,
    hash: generateRequestHash('changebalance', timestamp)
  };

  return data;
}

// Make a single request
async function makeRequest(transactionData, requestIndex) {
  const startTime = Date.now();
  
  try {
    const xAuth = generateXAuthorization('changebalance');
    
    const response = await axios.post(`${API_BASE_URL}/api/innova/changebalance`, transactionData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': xAuth,
        'X-Operator-Id': OPERATOR_ID
      },
      timeout: 15000 // 15 second timeout
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: true,
      requestIndex,
      transactionId: transactionData.data.transaction_id,
      responseTime,
      status: response.status,
      data: response.data
    };

  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: false,
      requestIndex,
      transactionId: transactionData.data.transaction_id,
      responseTime,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Run burst test
async function runBurstTest() {
  console.log('🚀 Starting Burst Transaction Test');
  console.log('=====================================');
  console.log(`Concurrent requests per batch: ${CONCURRENT_REQUESTS}`);
  console.log(`Total batches: ${TOTAL_BATCHES}`);
  console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log('');

  const allResults = [];
  let transactionCounter = 1000000;

  for (let batch = 1; batch <= TOTAL_BATCHES; batch++) {
    console.log(`📦 Batch ${batch}/${TOTAL_BATCHES} - Starting...`);
    
    const batchStartTime = Date.now();
    const promises = [];

    // Create concurrent requests
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      const transactionId = transactionCounter++;
      const amount = (Math.random() * 10 + 0.1).toFixed(2); // Random amount between 0.1 and 10.1
      const transactionType = Math.random() > 0.5 ? 'BET' : 'WIN';
      
      const transactionData = createTransactionData(transactionId, amount, transactionType);
      promises.push(makeRequest(transactionData, i + 1));
    }

    // Wait for all requests in this batch
    const batchResults = await Promise.all(promises);
    const batchEndTime = Date.now();
    const batchDuration = batchEndTime - batchStartTime;

    // Analyze batch results
    const successful = batchResults.filter(r => r.success).length;
    const failed = batchResults.filter(r => !r.success).length;
    const avgResponseTime = batchResults.reduce((sum, r) => sum + r.responseTime, 0) / batchResults.length;

    console.log(`✅ Batch ${batch} completed in ${batchDuration}ms`);
    console.log(`   Success: ${successful}, Failed: ${failed}`);
    console.log(`   Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${Math.min(...batchResults.map(r => r.responseTime))}ms`);
    console.log(`   Max Response Time: ${Math.max(...batchResults.map(r => r.responseTime))}ms`);
    console.log('');

    allResults.push(...batchResults);

    // Wait before next batch (except for last batch)
    if (batch < TOTAL_BATCHES) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  // Final analysis
  console.log('📊 Final Test Results');
  console.log('=====================');
  
  const totalSuccessful = allResults.filter(r => r.success).length;
  const totalFailed = allResults.filter(r => !r.success).length;
  const totalRequests = allResults.length;
  const successRate = (totalSuccessful / totalRequests * 100).toFixed(2);
  
  const responseTimes = allResults.map(r => r.responseTime);
  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful: ${totalSuccessful}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log('');
  console.log('Response Time Statistics:');
  console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Minimum: ${minResponseTime}ms`);
  console.log(`  Maximum: ${maxResponseTime}ms`);
  console.log(`  95th Percentile: ${p95ResponseTime}ms`);
  console.log('');

  // Show failed requests
  const failedRequests = allResults.filter(r => !r.success);
  if (failedRequests.length > 0) {
    console.log('❌ Failed Requests:');
    failedRequests.forEach((result, index) => {
      console.log(`  ${index + 1}. Transaction ${result.transactionId}: ${result.error}`);
      if (result.data) {
        console.log(`     Response: ${JSON.stringify(result.data)}`);
      }
    });
    console.log('');
  }

  // Performance assessment
  console.log('🎯 Performance Assessment:');
  if (successRate >= 95 && avgResponseTime < 100) {
    console.log('✅ EXCELLENT - System is performing well under load');
  } else if (successRate >= 90 && avgResponseTime < 200) {
    console.log('✅ GOOD - System is performing adequately');
  } else if (successRate >= 80 && avgResponseTime < 500) {
    console.log('⚠️  ACCEPTABLE - Some performance issues detected');
  } else {
    console.log('❌ POOR - Significant performance issues detected');
  }

  return allResults;
}

// Run the test
runBurstTest().catch(console.error); 