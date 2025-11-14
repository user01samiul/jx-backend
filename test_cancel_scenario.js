const { ProviderCallbackService } = require('./src/services/provider/provider-callback.service');

// Test scenario: Cancel win transaction
async function testCancelScenario() {
  console.log('=== Testing Cancel Scenario ===');
  
  // Simulate the request data
  const request = {
    command: 'cancel',
    request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    hash: 'test_hash',
    data: {
      user_id: '50',
      transaction_id: 'test_win_0.35_round1'
    }
  };

  try {
    // Call the handleCancel method
    const result = await ProviderCallbackService.handleCancel(request);
    console.log('Cancel result:', JSON.stringify(result, null, 2));
    
    // Check the balance after cancellation
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const balanceResult = await pool.query(
      'SELECT balance FROM user_category_balances WHERE user_id = 50 AND category = $1',
      ['slots']
    );
    
    console.log('Balance after cancellation:', balanceResult.rows[0]?.balance);
    
    await pool.end();
    
  } catch (error) {
    console.error('Error testing cancellation:', error);
  }
}

testCancelScenario(); 