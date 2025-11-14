const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'your_admin_token'; // Replace with actual admin token

async function testAdminBetsList() {
  try {
    console.log('=== Testing Admin Bets List ===\n');

    // 1. Get all bets
    console.log('1. Getting all bets...');
    const allBetsResponse = await axios.get(`${BASE_URL}/api/admin/bets`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!allBetsResponse.data.success) {
      console.log('❌ Failed to get bets:', allBetsResponse.data.message);
      return;
    }

    const allBets = allBetsResponse.data.data;
    console.log(`✅ Found ${allBets.length} total bets`);

    // 2. Show first 10 bets
    console.log('\n2. First 10 bets:');
    allBets.slice(0, 10).forEach((bet, index) => {
      console.log(`${index + 1}. Bet ID: ${bet.bet_id}, User: ${bet.username} (${bet.user_id}), Amount: $${bet.bet_amount}, Outcome: ${bet.outcome}`);
    });

    // 3. Look for bet ID 2 specifically
    console.log('\n3. Looking for bet ID 2...');
    const bet2 = allBets.find(bet => bet.bet_id === 2);
    if (bet2) {
      console.log('✅ Found bet ID 2:', bet2);
    } else {
      console.log('❌ Bet ID 2 not found in the list');
    }

    // 4. Show bet IDs 1-10
    console.log('\n4. Bet IDs 1-10:');
    for (let i = 1; i <= 10; i++) {
      const bet = allBets.find(bet => bet.bet_id === i);
      if (bet) {
        console.log(`Bet ID ${i}: ${bet.username} - $${bet.bet_amount} - ${bet.outcome}`);
      } else {
        console.log(`Bet ID ${i}: Not found`);
      }
    }

    // 5. Show some existing bet IDs
    console.log('\n5. Some existing bet IDs:');
    const existingBetIds = allBets.slice(0, 5).map(bet => bet.bet_id);
    existingBetIds.forEach(id => {
      console.log(`Bet ID ${id} exists`);
    });

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testAdminBetsList(); 