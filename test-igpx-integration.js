const axios = require('axios');
const crypto = require('crypto');

// IGPX Configuration (from database and .env)
const IGPX_CONFIG = {
  api_endpoint: 'https://sp-int-9cr.6579883.com',
  username: 'jackpotx',
  password: 'NwFhr_KsyqpJwi62_Bc',
  security_hash: '737e36e0-6d0b-4a67-aa50-2c448fe319f3'
};

const TEST_USER_ID = '1'; // Test user ID
const TEST_CURRENCY = 'USD';
const TEST_LANGUAGE = 'en';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

// Test 1: Authentication
async function testAuthentication() {
  log('\n=== TEST 1: Authentication ===', colors.bright);

  try {
    const response = await axios.post(`${IGPX_CONFIG.api_endpoint}/auth`, {
      username: IGPX_CONFIG.username,
      password: IGPX_CONFIG.password
    });

    if (response.data && response.data.token) {
      logSuccess('Authentication successful');
      logInfo(`Token: ${response.data.token.substring(0, 20)}...`);
      logInfo(`Expires in: ${response.data.expires_in} seconds`);
      return { success: true, token: response.data.token };
    } else {
      logError('Authentication failed - no token received');
      return { success: false, error: 'No token in response' };
    }
  } catch (error) {
    logError(`Authentication failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

// Test 2: Start Session
async function testStartSession(token) {
  log('\n=== TEST 2: Start Session ===', colors.bright);

  if (!token) {
    logWarning('Skipping - no valid token');
    return { success: false, error: 'No token' };
  }

  try {
    const response = await axios.post(
      `${IGPX_CONFIG.api_endpoint}/start-session`,
      {
        user_id: TEST_USER_ID,
        currency: TEST_CURRENCY,
        lang: TEST_LANGUAGE
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.url) {
      logSuccess('Session creation successful');
      logInfo(`Session URL: ${response.data.url}`);
      return { success: true, sessionUrl: response.data.url };
    } else {
      logError('Session creation failed - no URL received');
      return { success: false, error: 'No URL in response' };
    }
  } catch (error) {
    logError(`Session creation failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

// Test 3: Webhook Signature Verification
function testWebhookSignature() {
  log('\n=== TEST 3: Webhook Signature Verification ===', colors.bright);

  const testPayload = {
    transaction_id: 'test_txn_123',
    action: 'bet',
    user_id: TEST_USER_ID,
    currency: TEST_CURRENCY,
    amount: 10.00
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = crypto
    .createHmac('sha256', IGPX_CONFIG.security_hash)
    .update(payloadString)
    .digest('hex');

  logSuccess('Signature generation successful');
  logInfo(`Payload: ${payloadString}`);
  logInfo(`Signature: ${signature}`);

  // Verify the signature
  const verifySignature = crypto
    .createHmac('sha256', IGPX_CONFIG.security_hash)
    .update(payloadString)
    .digest('hex');

  if (signature === verifySignature) {
    logSuccess('Signature verification successful');
    return { success: true, signature, payload: testPayload };
  } else {
    logError('Signature verification failed');
    return { success: false };
  }
}

// Test 4: Test Webhook Endpoint (Bet Transaction)
async function testWebhookBet(signature, payload) {
  log('\n=== TEST 4: Webhook Bet Transaction ===', colors.bright);

  try {
    const response = await axios.post(
      'http://localhost:3001/api/payment/webhook/igpx',
      payload,
      {
        headers: {
          'X-Security-Hash': signature,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.error === null) {
      logSuccess('Bet webhook processed successfully');
      logInfo(`Response: ${JSON.stringify(response.data)}`);
      return { success: true };
    } else {
      logError('Bet webhook failed');
      logError(`Response: ${JSON.stringify(response.data)}`);
      return { success: false };
    }
  } catch (error) {
    logError(`Bet webhook request failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

// Test 5: Test Webhook Result Transaction
async function testWebhookResult() {
  log('\n=== TEST 5: Webhook Result (Win) Transaction ===', colors.bright);

  const payload = {
    transaction_id: 'test_result_123',
    action: 'result',
    user_id: TEST_USER_ID,
    currency: TEST_CURRENCY,
    amount: 25.00
  };

  const signature = crypto
    .createHmac('sha256', IGPX_CONFIG.security_hash)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const response = await axios.post(
      'http://localhost:3001/api/payment/webhook/igpx',
      payload,
      {
        headers: {
          'X-Security-Hash': signature,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.error === null) {
      logSuccess('Result webhook processed successfully');
      logInfo(`Response: ${JSON.stringify(response.data)}`);
      return { success: true };
    } else {
      logError('Result webhook failed');
      logError(`Response: ${JSON.stringify(response.data)}`);
      return { success: false };
    }
  } catch (error) {
    logError(`Result webhook request failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

// Test 6: Test Webhook Rollback Transaction
async function testWebhookRollback() {
  log('\n=== TEST 6: Webhook Rollback Transaction ===', colors.bright);

  const payload = {
    transaction_id: 'test_rollback_123',
    action: 'rollback',
    rollback_transaction_id: 'test_txn_123',
    user_id: TEST_USER_ID,
    currency: TEST_CURRENCY,
    amount: 10.00
  };

  const signature = crypto
    .createHmac('sha256', IGPX_CONFIG.security_hash)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    const response = await axios.post(
      'http://localhost:3001/api/payment/webhook/igpx',
      payload,
      {
        headers: {
          'X-Security-Hash': signature,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.error === null) {
      logSuccess('Rollback webhook processed successfully');
      logInfo(`Response: ${JSON.stringify(response.data)}`);
      return { success: true };
    } else {
      logError('Rollback webhook failed');
      logError(`Response: ${JSON.stringify(response.data)}`);
      return { success: false };
    }
  } catch (error) {
    logError(`Rollback webhook request failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

// Test 7: Test Invalid Signature
async function testInvalidSignature() {
  log('\n=== TEST 7: Invalid Signature Rejection ===', colors.bright);

  const payload = {
    transaction_id: 'test_invalid_123',
    action: 'bet',
    user_id: TEST_USER_ID,
    currency: TEST_CURRENCY,
    amount: 5.00
  };

  const invalidSignature = 'invalid_signature_here';

  try {
    const response = await axios.post(
      'http://localhost:3001/api/payment/webhook/igpx',
      payload,
      {
        headers: {
          'X-Security-Hash': invalidSignature,
          'Content-Type': 'application/json'
        }
      }
    );

    logError('Invalid signature was accepted (SECURITY ISSUE!)');
    return { success: false };
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logSuccess('Invalid signature correctly rejected');
      return { success: true };
    } else {
      logWarning(`Unexpected error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), colors.bright);
  log('IGPX SPORTSBOOK INTEGRATION TEST SUITE', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // Test 1: Authentication
  results.total++;
  const authResult = await testAuthentication();
  if (authResult.success) results.passed++;
  else results.failed++;

  // Test 2: Start Session
  results.total++;
  const sessionResult = await testStartSession(authResult.token);
  if (sessionResult.success) results.passed++;
  else if (authResult.success) results.failed++;
  else results.skipped++;

  // Test 3: Webhook Signature
  results.total++;
  const sigResult = testWebhookSignature();
  if (sigResult.success) results.passed++;
  else results.failed++;

  // Test 4: Bet Webhook
  results.total++;
  if (sigResult.success) {
    const betResult = await testWebhookBet(sigResult.signature, sigResult.payload);
    if (betResult.success) results.passed++;
    else results.failed++;
  } else {
    results.skipped++;
  }

  // Test 5: Result Webhook
  results.total++;
  const resultWebhook = await testWebhookResult();
  if (resultWebhook.success) results.passed++;
  else results.failed++;

  // Test 6: Rollback Webhook
  results.total++;
  const rollbackResult = await testWebhookRollback();
  if (rollbackResult.success) results.passed++;
  else results.failed++;

  // Test 7: Invalid Signature
  results.total++;
  const invalidSigResult = await testInvalidSignature();
  if (invalidSigResult.success) results.passed++;
  else results.failed++;

  // Summary
  log('\n' + '='.repeat(60), colors.bright);
  log('TEST SUMMARY', colors.bright);
  log('='.repeat(60), colors.bright);
  log(`Total Tests: ${results.total}`);
  log(`Passed: ${results.passed}`, results.passed === results.total ? colors.green : colors.reset);
  log(`Failed: ${results.failed}`, results.failed > 0 ? colors.red : colors.reset);
  log(`Skipped: ${results.skipped}`, results.skipped > 0 ? colors.yellow : colors.reset);

  const successRate = ((results.passed / results.total) * 100).toFixed(2);
  log(`\nSuccess Rate: ${successRate}%`, successRate === '100.00' ? colors.green : colors.yellow);
  log('='.repeat(60) + '\n', colors.bright);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  logError(`Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
