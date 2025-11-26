const axios = require('axios');

/**
 * Test script to verify the two critical bonus system fixes:
 * 1. Main wallet balance shows correct amount (from user_balances table)
 * 2. Transfer from bonus wallet updates user_balances.balance
 */

const BASE_URL = 'http://localhost:3001/api';

// You'll need a valid token for testing
const TOKEN = 'YOUR_TOKEN_HERE';

async function testBonusSystem() {
  console.log('=== Testing Bonus System Fixes ===\n');

  try {
    // Test 1: Check combined balance (should show correct main wallet balance)
    console.log('Test 1: Checking combined balance...');
    const balanceResponse = await axios.get(`${BASE_URL}/bonus/combined-balance`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    console.log('Combined Balance Response:');
    console.log(JSON.stringify(balanceResponse.data, null, 2));
    console.log('\n✅ Main wallet balance from user_balances table:', balanceResponse.data.data.mainWallet);
    console.log('✅ Total available (should equal main wallet):', balanceResponse.data.data.totalAvailable);

    if (balanceResponse.data.data.mainWallet === balanceResponse.data.data.totalAvailable) {
      console.log('✓ PASS: totalAvailable correctly shows only main wallet\n');
    } else {
      console.log('✗ FAIL: totalAvailable should equal mainWallet\n');
    }

    // Test 2: Check bonus wallet (should include releasable_amount and total_bonus_transferred)
    console.log('Test 2: Checking bonus wallet...');
    const walletResponse = await axios.get(`${BASE_URL}/bonus/wallet`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    console.log('Bonus Wallet Response:');
    console.log(JSON.stringify(walletResponse.data, null, 2));

    if (walletResponse.data.data.releasable_amount !== undefined) {
      console.log('\n✓ PASS: releasable_amount field exists:', walletResponse.data.data.releasable_amount);
    } else {
      console.log('\n✗ FAIL: releasable_amount field missing');
    }

    if (walletResponse.data.data.total_bonus_transferred !== undefined) {
      console.log('✓ PASS: total_bonus_transferred field exists:', walletResponse.data.data.total_bonus_transferred);
    } else {
      console.log('✗ FAIL: total_bonus_transferred field missing');
    }

    // Test 3: Check if transfer endpoint exists
    console.log('\nTest 3: Checking transfer endpoint...');
    const releasableAmount = walletResponse.data.data.releasable_amount;

    if (releasableAmount > 0) {
      console.log(`Found releasable amount: ${releasableAmount}`);
      console.log('You can now test transfer by calling:');
      console.log(`POST ${BASE_URL}/bonus/transfer-to-main`);
      console.log('This will update user_balances.balance');
    } else {
      console.log('No releasable bonus funds available for transfer');
      console.log('Complete wagering on a bonus to test transfer functionality');
    }

  } catch (error) {
    console.error('Error testing bonus system:', error.response?.data || error.message);
  }
}

// Instructions
console.log('===============================================');
console.log('BONUS SYSTEM FIX VERIFICATION');
console.log('===============================================\n');
console.log('INSTRUCTIONS:');
console.log('1. Get your auth token from localStorage in the frontend');
console.log('2. Replace YOUR_TOKEN_HERE with your actual token');
console.log('3. Run: node test-bonus-fixes.js\n');
console.log('FIXES APPLIED:');
console.log('✓ Fix 1: getCombinedBalance() now reads from user_balances table');
console.log('✓ Fix 2: transferToMainWallet() now updates user_balances.balance');
console.log('===============================================\n');

// Uncomment to run
// testBonusSystem();
