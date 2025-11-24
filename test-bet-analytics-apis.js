/**
 * Test script for Bet Analytics APIs
 * Tests all 5 new endpoints:
 * 1. GET /api/admin/bets/statistics
 * 2. GET /api/admin/bets/analytics
 * 3. GET /api/admin/bets/game-performance
 * 4. GET /api/admin/bets/results-distribution
 * 5. GET /api/admin/bets/provider-performance
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3004';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjM5ODc2MTUsImV4cCI6MTc2NDA3NDAxNX0.tDOxI8jiYgxy-KQmgiQmW7cz6IXXP11-SdeOspPvTLA';

// Helper function to make API calls
async function testEndpoint(name, url, params = {}) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${name}`);
  console.log(`URL: ${url}`);
  console.log(`Params:`, params);
  console.log('='.repeat(80));

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params
    });

    console.log('✅ SUCCESS');
    console.log('Status:', response.status);
    console.log('Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    return { success: true, data: response.data };
  } catch (error) {
    console.log('❌ ERROR');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error Message:', error.message);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n🚀 Starting Bet Analytics API Tests...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Admin Token: ${ADMIN_TOKEN.substring(0, 20)}...`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Test 1: Bet Statistics
  const test1 = await testEndpoint(
    '1. Bet Statistics (7 days)',
    `${BASE_URL}/api/admin/bets/statistics`,
    { timeRange: '7d' }
  );
  results.total++;
  if (test1.success) results.passed++;
  else results.failed++;

  // Test 2: Bet Statistics (30 days)
  const test2 = await testEndpoint(
    '2. Bet Statistics (30 days)',
    `${BASE_URL}/api/admin/bets/statistics`,
    { timeRange: '30d' }
  );
  results.total++;
  if (test2.success) results.passed++;
  else results.failed++;

  // Test 3: Bet Analytics (7 days, daily grouping)
  const test3 = await testEndpoint(
    '3. Bet Analytics (7 days, daily)',
    `${BASE_URL}/api/admin/bets/analytics`,
    { timeRange: '7d', groupBy: 'day' }
  );
  results.total++;
  if (test3.success) results.passed++;
  else results.failed++;

  // Test 4: Bet Analytics (30 days, weekly grouping)
  const test4 = await testEndpoint(
    '4. Bet Analytics (30 days, weekly)',
    `${BASE_URL}/api/admin/bets/analytics`,
    { timeRange: '30d', groupBy: 'week' }
  );
  results.total++;
  if (test4.success) results.passed++;
  else results.failed++;

  // Test 5: Game Performance (top 10)
  const test5 = await testEndpoint(
    '5. Game Performance (top 10)',
    `${BASE_URL}/api/admin/bets/game-performance`,
    { timeRange: '7d', limit: 10 }
  );
  results.total++;
  if (test5.success) results.passed++;
  else results.failed++;

  // Test 6: Game Performance (top 5, 30 days)
  const test6 = await testEndpoint(
    '6. Game Performance (top 5, 30 days)',
    `${BASE_URL}/api/admin/bets/game-performance`,
    { timeRange: '30d', limit: 5 }
  );
  results.total++;
  if (test6.success) results.passed++;
  else results.failed++;

  // Test 7: Results Distribution (7 days)
  const test7 = await testEndpoint(
    '7. Results Distribution (7 days)',
    `${BASE_URL}/api/admin/bets/results-distribution`,
    { timeRange: '7d' }
  );
  results.total++;
  if (test7.success) results.passed++;
  else results.failed++;

  // Test 8: Results Distribution (all time)
  const test8 = await testEndpoint(
    '8. Results Distribution (all time)',
    `${BASE_URL}/api/admin/bets/results-distribution`,
    { timeRange: 'all' }
  );
  results.total++;
  if (test8.success) results.passed++;
  else results.failed++;

  // Test 9: Provider Performance (top 10)
  const test9 = await testEndpoint(
    '9. Provider Performance (top 10)',
    `${BASE_URL}/api/admin/bets/provider-performance`,
    { timeRange: '7d', limit: 10 }
  );
  results.total++;
  if (test9.success) results.passed++;
  else results.failed++;

  // Test 10: Provider Performance (all time)
  const test10 = await testEndpoint(
    '10. Provider Performance (all time)',
    `${BASE_URL}/api/admin/bets/provider-performance`,
    { timeRange: 'all', limit: 5 }
  );
  results.total++;
  if (test10.success) results.passed++;
  else results.failed++;

  // Test 11: Invalid time range (should fail)
  console.log('\n' + '='.repeat(80));
  console.log('Testing: 11. Invalid Time Range (should return 400)');
  console.log('='.repeat(80));
  const test11 = await testEndpoint(
    '11. Invalid Time Range',
    `${BASE_URL}/api/admin/bets/statistics`,
    { timeRange: 'invalid' }
  );
  results.total++;
  // This should fail with 400, so we count it as passed if it fails
  if (!test11.success) {
    console.log('✅ Correctly rejected invalid time range');
    results.passed++;
  } else {
    console.log('❌ Should have rejected invalid time range');
    results.failed++;
  }

  // Print summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log('='.repeat(80));

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The Bet Analytics APIs are working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
