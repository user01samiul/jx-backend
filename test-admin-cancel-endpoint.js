const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'your_admin_token'; // Replace with actual admin token

// Test data
const testData = {
  user_id: 48,
  bet_id: 2413, // Use the bet ID from the user's example
  reason: 'test_mongo_verification'
};

async function testAdminCancelEndpoint() {
  try {
    console.log('=== Testing New Admin Bet Cancellation Endpoint ===\n');

    // 1. First, check if the bet exists and get its details
    console.log('1. Checking bet details...');
    const betResponse = await axios.get(`${BASE_URL}/api/admin/bets?user_id=${testData.user_id}`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!betResponse.data.success) {
      console.log('❌ Failed to get bets:', betResponse.data.message);
      return;
    }

    const bets = betResponse.data.data;
    const targetBet = bets.find(bet => bet.bet_id === testData.bet_id);
    
    if (!targetBet) {
      console.log(`❌ Bet ${testData.bet_id} not found for user ${testData.user_id}`);
      return;
    }

    console.log(`✅ Found bet: ${targetBet.bet_id}, amount: $${targetBet.bet_amount}, transaction: ${targetBet.transaction_id}\n`);

    // 2. Check MongoDB transactions before cancellation
    console.log('2. Checking MongoDB transactions before cancellation...');
    const beforeMongoResult = await require('child_process').execSync(
      `docker exec mongo_db mongosh jackpotx-db --eval "db.transactions.find({external_reference: '${targetBet.transaction_id}'}).toArray()"`,
      { encoding: 'utf8' }
    );
    console.log('MongoDB transactions before:', beforeMongoResult);

    // 3. Perform admin bet cancellation using the new endpoint
    console.log('3. Performing admin bet cancellation using new endpoint...');
    const cancelRequest = {
      reason: testData.reason,
      admin_note: 'Testing new admin cancellation endpoint',
      notify_user: false,
      refund_method: 'balance',
      force_cancel: false
    };

    const cancelResponse = await axios.post(
      `${BASE_URL}/api/admin/bets/${testData.bet_id}/cancel`,
      cancelRequest,
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Cancel response:', JSON.stringify(cancelResponse.data, null, 2));

    if (!cancelResponse.data.success) {
      console.log('❌ Bet cancellation failed:', cancelResponse.data.message);
      return;
    }

    console.log('✅ Bet cancelled successfully\n');

    // 4. Check MongoDB transactions after cancellation
    console.log('4. Checking MongoDB transactions after cancellation...');
    const afterMongoResult = await require('child_process').execSync(
      `docker exec mongo_db mongosh jackpotx-db --eval "db.transactions.find({external_reference: 'cancel_${targetBet.transaction_id}'}).toArray()"`,
      { encoding: 'utf8' }
    );
    console.log('MongoDB cancellation transactions:', afterMongoResult);

    // 5. Check if the original transaction was marked as cancelled
    console.log('5. Checking if original transaction was marked as cancelled...');
    const cancelledTransactionResult = await require('child_process').execSync(
      `docker exec mongo_db mongosh jackpotx-db --eval "db.transactions.find({external_reference: '${targetBet.transaction_id}'}).toArray()"`,
      { encoding: 'utf8' }
    );
    console.log('Original transaction status:', cancelledTransactionResult);

    // 6. Check if bet outcome was updated
    console.log('6. Checking if bet outcome was updated...');
    const betResult = await require('child_process').execSync(
      `docker exec mongo_db mongosh jackpotx-db --eval "db.bets.find({external_reference: '${targetBet.transaction_id}'}).toArray()"`,
      { encoding: 'utf8' }
    );
    console.log('Bet outcome:', betResult);

    console.log('\n=== Test Complete ===');
    console.log('✅ New admin bet cancellation endpoint should now create MongoDB transactions');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAdminCancelEndpoint(); 