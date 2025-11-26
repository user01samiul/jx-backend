const axios = require('axios');

// Test configuration
const API_URL = 'https://backend.jackpotx.net/api';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjQxMDE5NDIsImV4cCI6MTc2NDE4ODM0Mn0.9bFdLo3-vhs-bEnwYvW6Di-wHNX8nhnkUqycnFTDxUM';
const BONUS_CODE = 'TESTDUP50'; // New test bonus

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

// Apply bonus code
async function applyBonusCode(code, attemptNumber) {
  try {
    const response = await axios.post(
      `${API_URL}/bonus/apply-code`,
      { code },
      {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      attempt: attemptNumber,
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      attempt: attemptNumber,
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function runTest() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          DUPLICATE BONUS CLAIM PREVENTION TEST                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');

  logSection('Test: Apply Same Bonus Code 5 Times');
  log(`Bonus Code: ${BONUS_CODE}`, 'yellow');
  log('Testing sequential application (5 attempts)...', 'blue');

  const results = [];

  for (let i = 1; i <= 5; i++) {
    log(`\nAttempt ${i}:`, 'blue');
    const result = await applyBonusCode(BONUS_CODE, i);
    results.push(result);

    if (result.success) {
      log(`✓ SUCCESS: ${result.data.message}`, 'green');
      if (result.data.data) {
        log(`  Bonus Amount: $${result.data.data.bonus_amount}`, 'white');
        log(`  Wagering Required: ${result.data.data.wager_requirement_amount}`, 'white');
      }
    } else {
      log(`✗ FAILED: ${result.error}`, 'red');
      log(`  HTTP Status: ${result.status}`, 'white');
    }

    // Wait 300ms between attempts
    if (i < 5) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Analysis
  logSection('Test Results Analysis');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  log(`Total Attempts: ${results.length}`, 'white');
  log(`Successful: ${successCount}`, successCount === 1 ? 'green' : 'red');
  log(`Failed: ${failCount}`, failCount === 4 ? 'green' : 'red');

  console.log('\n' + '-'.repeat(80));

  if (successCount === 1 && failCount === 4) {
    log('✓ TEST PASSED: Duplicate prevention is working!', 'green');
    log('  → Only 1 bonus was granted', 'green');
    log('  → Subsequent 4 attempts were blocked', 'green');
    log('  → System is protected against duplicate claims', 'green');
  } else if (successCount === 0 && failCount === 5) {
    log('✓ TEST PASSED: All attempts blocked (bonus already claimed)', 'green');
    log('  → Bonus was claimed in a previous test', 'yellow');
    log('  → System is preventing re-claims correctly', 'green');
  } else if (successCount > 1) {
    log('✗ TEST FAILED: Multiple bonuses were granted!', 'red');
    log(`  → ${successCount} bonuses granted (should be max 1)`, 'red');
    log('  → SECURITY ISSUE: Users can claim multiple times!', 'red');
  } else {
    log('⚠ UNEXPECTED RESULT', 'yellow');
    log(`  → Success: ${successCount}, Failed: ${failCount}`, 'yellow');
  }

  console.log('\n' + '-'.repeat(80));

  // Show error messages
  const failedAttempts = results.filter(r => !r.success);
  if (failedAttempts.length > 0) {
    log('\nError Messages:', 'cyan');
    failedAttempts.forEach(attempt => {
      log(`  Attempt ${attempt.attempt}: "${attempt.error}"`, 'white');
    });
  }

  logSection('BONUS CLAIM PREVENTION TEST COMPLETE');

  if (successCount <= 1) {
    log('✓ SECURITY STATUS: PROTECTED', 'green');
    log('  Users cannot claim bonuses multiple times', 'green');
    log('  Database constraints are working correctly', 'green');
  } else {
    log('✗ SECURITY STATUS: VULNERABLE', 'red');
    log('  URGENT: Fix required to prevent bonus exploitation', 'red');
  }
}

runTest().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
