const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
  user_id: 48,
  game_id: 45,
  token: 'test_token_123', // This will be replaced with a real token
  currency_code: 'USD'
};

async function testBalanceUpdate() {
  try {
    console.log('=== Testing Balance Update Fix ===\n');

    // 1. Get initial balance
    console.log('1. Getting initial balance...');
    const balanceRequest = {
      command: 'balance',
      request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      hash: 'test_hash',
      data: {
        user_id: testData.user_id,
        game_id: testData.game_id,
        token: testData.token
      }
    };

    const balanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Initial balance response:', JSON.stringify(balanceResponse.data, null, 2));
    const initialBalance = balanceResponse.data.response.data.balance;
    console.log(`Initial balance: $${initialBalance}\n`);

    // 2. Test BET transaction
    console.log('2. Testing BET transaction...');
    const betRequest = {
      command: 'changebalance',
      request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      hash: 'test_hash',
      data: {
        user_id: testData.user_id,
        game_id: testData.game_id,
        transaction_type: 'BET',
        amount: 5.00,
        currency_code: testData.currency_code,
        transaction_id: `test_bet_${Date.now()}`,
        session_id: `test_session_${Date.now()}`,
        round_id: `test_round_${Date.now()}`
      }
    };

    const betResponse = await axios.post(`${BASE_URL}/innova/changebalance`, betRequest, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('BET response:', JSON.stringify(betResponse.data, null, 2));
    const balanceAfterBet = betResponse.data.response.data.balance;
    console.log(`Balance after BET: $${balanceAfterBet}`);
    console.log(`Expected: $${initialBalance - 5.00}, Actual: $${balanceAfterBet}`);
    console.log(`Balance deduction working: ${balanceAfterBet === initialBalance - 5.00 ? 'YES' : 'NO'}\n`);

    // 3. Test WIN transaction
    console.log('3. Testing WIN transaction...');
    const winRequest = {
      command: 'changebalance',
      request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      hash: 'test_hash',
      data: {
        user_id: testData.user_id,
        game_id: testData.game_id,
        transaction_type: 'WIN',
        amount: 8.00,
        currency_code: testData.currency_code,
        transaction_id: `test_win_${Date.now()}`,
        session_id: `test_session_${Date.now()}`,
        round_id: `test_round_${Date.now()}`
      }
    };

    const winResponse = await axios.post(`${BASE_URL}/innova/changebalance`, winRequest, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('WIN response:', JSON.stringify(winResponse.data, null, 2));
    const balanceAfterWin = winResponse.data.response.data.balance;
    console.log(`Balance after WIN: $${balanceAfterWin}`);
    console.log(`Expected: $${balanceAfterBet + 8.00}, Actual: $${balanceAfterWin}`);
    console.log(`Balance addition working: ${balanceAfterWin === balanceAfterBet + 8.00 ? 'YES' : 'NO'}\n`);

    // 4. Final balance check
    console.log('4. Final balance check...');
    const finalBalanceRequest = {
      command: 'balance',
      request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      hash: 'test_hash',
      data: {
        user_id: testData.user_id,
        game_id: testData.game_id,
        token: testData.token
      }
    };

    const finalBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, finalBalanceRequest, {
      headers: { 'Content-Type': 'application/json' }
    });

    const finalBalance = finalBalanceResponse.data.response.data.balance;
    console.log(`Final balance: $${finalBalance}`);
    console.log(`Expected: $${initialBalance - 5.00 + 8.00}, Actual: $${finalBalance}`);
    console.log(`Total balance change correct: ${finalBalance === initialBalance - 5.00 + 8.00 ? 'YES' : 'NO'}\n`);

    console.log('=== Test Complete ===');

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testBalanceUpdate(); 