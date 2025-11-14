const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
  user_id: 48,
  amount: 50,
  description: 'Test topup fix'
};

async function testTopup() {
  try {
    console.log('=== Testing Topup Endpoint Fix ===\n');

    // 1. Get initial balance from PostgreSQL
    console.log('1. Getting initial PostgreSQL balance...');
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const initialBalanceQuery = `docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT balance, total_deposited FROM user_balances WHERE user_id = ${testData.user_id};"`;
    const { stdout: initialBalanceOutput } = await execAsync(initialBalanceQuery);
    
    console.log('Initial PostgreSQL balance:', initialBalanceOutput);
    
    // Parse the balance from the output
    const balanceMatch = initialBalanceOutput.match(/\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)/);
    const initialBalance = balanceMatch ? parseFloat(balanceMatch[1]) : 0;
    const initialTotalDeposited = balanceMatch ? parseFloat(balanceMatch[2]) : 0;
    
    console.log(`Initial balance: $${initialBalance}, Total deposited: $${initialTotalDeposited}\n`);

    // 2. Test topup endpoint
    console.log('2. Testing topup endpoint...');
    const topupRequest = {
      amount: testData.amount,
      description: testData.description
    };

    const topupResponse = await axios.post(`${BASE_URL}/api/admin/users/${testData.user_id}/topup`, topupRequest, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin_token' // You'll need to replace this with a real admin token
      }
    });

    console.log('Topup response:', JSON.stringify(topupResponse.data, null, 2));
    
    if (topupResponse.data.success) {
      console.log(`Topup successful! Transaction ID: ${topupResponse.data.data.transaction_id}`);
      console.log(`New balance: $${topupResponse.data.data.new_balance}`);
      console.log(`Expected balance: $${initialBalance + testData.amount}`);
      console.log(`Balance update working: ${topupResponse.data.data.new_balance === initialBalance + testData.amount ? 'YES' : 'NO'}\n`);
    } else {
      console.log('Topup failed:', topupResponse.data.message);
      return;
    }

    // 3. Verify PostgreSQL balance update
    console.log('3. Verifying PostgreSQL balance update...');
    const finalBalanceQuery = `docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT balance, total_deposited FROM user_balances WHERE user_id = ${testData.user_id};"`;
    const { stdout: finalBalanceOutput } = await execAsync(finalBalanceQuery);
    
    console.log('Final PostgreSQL balance:', finalBalanceOutput);
    
    const finalBalanceMatch = finalBalanceOutput.match(/\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)/);
    const finalBalance = finalBalanceMatch ? parseFloat(finalBalanceMatch[1]) : 0;
    const finalTotalDeposited = finalBalanceMatch ? parseFloat(finalBalanceMatch[2]) : 0;
    
    console.log(`Final balance: $${finalBalance}, Total deposited: $${finalTotalDeposited}`);
    console.log(`Expected balance: $${initialBalance + testData.amount}, Actual: $${finalBalance}`);
    console.log(`Expected total deposited: $${initialTotalDeposited + testData.amount}, Actual: $${finalTotalDeposited}`);
    console.log(`PostgreSQL balance update working: ${finalBalance === initialBalance + testData.amount ? 'YES' : 'NO'}\n`);

    // 4. Verify MongoDB transaction
    console.log('4. Verifying MongoDB transaction...');
    const mongoQuery = `docker exec mongo_db mongosh "mongodb://admin:jackpotxPassword_145225@localhost:27017/jackpotx-db?authSource=jackpotx-db" --eval "db.transactions.find({user_id: ${testData.user_id}, type: 'deposit', description: '${testData.description}'}).sort({created_at: -1}).limit(1).pretty()"`;
    const { stdout: mongoOutput } = await execAsync(mongoQuery);
    
    console.log('MongoDB transaction:', mongoOutput);
    
    if (mongoOutput.includes('ObjectId')) {
      console.log('MongoDB transaction created successfully!');
    } else {
      console.log('MongoDB transaction not found!');
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testTopup(); 