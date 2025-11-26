const axios = require('axios');

// Test with a valid admin token (update this with a fresh token)
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjU2LCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwicm9sZUlkIjoxLCJpYXQiOjE3NjM5ODc2MTUsImV4cCI6MTc2NDA3NDAxNX0.tDOxI8jiYgxy-KQmgiQmW7cz6IXXP11-SdeOspPvTLA';

async function testAvailableBonuses() {
  try {
    console.log('\n🔍 Testing /api/bonus/available endpoint...\n');

    const response = await axios.get('https://backend.jackpotx.net/api/bonus/available', {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    console.log('✅ API Response Status:', response.status);
    console.log('\n📊 Response Data Structure:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.data) {
      const { coded, deposit, loyalty, cashback } = response.data.data;

      console.log('\n📈 Summary:');
      console.log(`  - Coded Bonuses: ${coded?.length || 0}`);
      console.log(`  - Deposit Bonuses: ${deposit?.length || 0}`);
      console.log(`  - Loyalty Bonuses: ${loyalty?.length || 0}`);
      console.log(`  - Cashback Bonuses: ${cashback?.length || 0}`);
      console.log(`  - Total: ${(coded?.length || 0) + (deposit?.length || 0) + (loyalty?.length || 0) + (cashback?.length || 0)}`);

      // Display each coded bonus
      if (coded && coded.length > 0) {
        console.log('\n💰 Coded Bonuses:');
        coded.forEach(bonus => {
          console.log(`  - ${bonus.name} (Code: ${bonus.bonus_code})`);
          console.log(`    Amount: ${bonus.currency} ${bonus.amount} (${bonus.award_type})`);
          console.log(`    Wagering: ${bonus.wager_requirement_multiplier}x`);
          console.log(`    Description: ${bonus.description}`);
        });
      }

      // Display each deposit bonus
      if (deposit && deposit.length > 0) {
        console.log('\n💵 Deposit Bonuses:');
        deposit.forEach(bonus => {
          console.log(`  - ${bonus.name}`);
          console.log(`    Amount: ${bonus.currency} ${bonus.amount} (${bonus.award_type})`);
          console.log(`    Wagering: ${bonus.wager_requirement_multiplier}x`);
          console.log(`    Description: ${bonus.description}`);
        });
      }
    }

    console.log('\n✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error testing API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testAvailableBonuses();
