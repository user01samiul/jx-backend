const axios = require('axios');
const crypto = require('crypto');

const SECRET_KEY = '2xk3SrX09oQ71Z3F';
const API_BASE_URL = 'https://backend.jackpotx.net/api/innova';

// Generate X-Authorization header (for command validation)
function generateXAuthorization(command) {
  return crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
}

// Generate request hash (for request validation)
function generateRequestHash(command, requestTimestamp) {
  return crypto.createHash('sha1').update(command + requestTimestamp + SECRET_KEY).digest('hex');
}

async function testComprehensiveWinFix() {
  const token = '3ca0a36a0ceb7a2befda77a6a934b9bf'; // Valid token for user 48
  const round_id = '1355500'; // New round for testing
  
  console.log('=== COMPREHENSIVE WIN CALCULATION FIX TEST ===\n');
  
  // Step 1: Place multiple bets with different amounts
  console.log('=== STEP 1: Placing multiple bets ===');
  const bets = [];
  
  const betAmounts = [1.00, 2.50, 3.75, 5.00, 7.25, 4.50, 6.80, 2.20, 8.90, 3.30];
  
  for (let i = 0; i < betAmounts.length; i++) {
    const betData = {
      transaction_id: `224700${i}`,
      amount: betAmounts[i],
      urid: `WT081119000000${i}test99`,
      history_id: `2-comp${i}`
    };
    
    const timestamp = new Date(Date.now() + i * 50).toISOString().replace('T', ' ').substring(0, 19);
    
    const requestData = {
      command: 'changebalance',
      data: {
        transaction_type: 'BET',
        reason: 'SPIN',
        amount: betData.amount,
        currency_code: 'USD',
        transaction_id: betData.transaction_id,
        transaction_timestamp: timestamp,
        round_id: round_id,
        round_finished: false,
        game_id: 15,
        user_id: '48',
        token: token,
        context: {
          reason: 'SPIN',
          urid: betData.urid,
          history_id: betData.history_id
        }
      },
      request_timestamp: timestamp,
      hash: generateRequestHash('changebalance', timestamp)
    };

    const headers = {
      'X-Authorization': generateXAuthorization('changebalance'),
      'X-Operator-Id': 'thinkcode_stg',
      'X-TT-Operator-Id': 'thinkcode_stg',
      'X-Req-Id': betData.urid,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/changebalance`, requestData, { headers });
      console.log(`Bet ${betData.transaction_id}: ${betData.amount} USD - Balance: ${response.data.response.data.balance}`);
      bets.push(betData);
    } catch (error) {
      console.error(`Error with bet ${betData.transaction_id}:`, error.response ? error.response.data : error.message);
    }
  }
  
  // Wait for bets to be processed
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 2: Process wins for each bet (different win amounts)
  console.log('\n=== STEP 2: Processing wins ===');
  
  const winMultipliers = [1.2, 1.5, 0.8, 2.1, 1.7, 1.3, 1.9, 0.5, 2.5, 1.1]; // Different multipliers
  
  for (let i = 0; i < bets.length; i++) {
    const bet = bets[i];
    const winAmount = bet.amount * winMultipliers[i]; // Different win amounts
    
    const winData = {
      transaction_id: `224710${i}`,
      amount: winAmount,
      urid: bet.urid, // Same session as the bet
      history_id: `2-win${i}`
    };
    
    const timestamp = new Date(Date.now() + i * 50).toISOString().replace('T', ' ').substring(0, 19);
    
    const requestData = {
      command: 'changebalance',
      data: {
        transaction_type: 'WIN',
        reason: 'SPIN',
        amount: winData.amount,
        currency_code: 'USD',
        transaction_id: winData.transaction_id,
        transaction_timestamp: timestamp,
        round_id: round_id,
        round_finished: true,
        game_id: 15,
        user_id: '48',
        token: token,
        context: {
          reason: 'SPIN',
          urid: winData.urid,
          history_id: winData.history_id
        }
      },
      request_timestamp: timestamp,
      hash: generateRequestHash('changebalance', timestamp)
    };

    const headers = {
      'X-Authorization': generateXAuthorization('changebalance'),
      'X-Operator-Id': 'thinkcode_stg',
      'X-TT-Operator-Id': 'thinkcode_stg',
      'X-Req-Id': winData.urid,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/changebalance`, requestData, { headers });
      console.log(`Win ${winData.transaction_id}: ${winData.amount.toFixed(2)} USD - Balance: ${response.data.response.data.balance}`);
    } catch (error) {
      console.error(`Error with win ${winData.transaction_id}:`, error.response ? error.response.data : error.message);
    }
  }
  
  // Wait for wins to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Verify results
  console.log('\n=== STEP 3: Verifying results ===');
  
  const { exec } = require('child_process');
  
  // Check bets table
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT b.id, b.bet_amount, b.win_amount, b.outcome, t.external_reference FROM bets b JOIN transactions t ON b.transaction_id = t.id WHERE t.metadata->>'round_id' = '${round_id}' ORDER BY b.created_at;"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Database check error:', error);
      return;
    }
    console.log('Bets table results:');
    console.log(stdout);
  });
  
  // Check transactions table
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT id, external_reference, type, amount, balance_after, created_at FROM transactions WHERE metadata->>'round_id' = '${round_id}' ORDER BY created_at;"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Database check error:', error);
      return;
    }
    console.log('\nTransactions table results:');
    console.log(stdout);
  });
  
  // Check for any missing balance_after values
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT COUNT(*) as missing_balance_count FROM transactions WHERE balance_after IS NULL AND metadata->>'round_id' = '${round_id}';"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Balance check error:', error);
      return;
    }
    console.log('\nMissing balance_after count:', stdout.trim());
  });
  
  // Check final balance
  exec('docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT balance FROM user_category_balances WHERE user_id = 48;"', (error, stdout, stderr) => {
    if (error) {
      console.error('Balance check error:', error);
      return;
    }
    console.log('\nFinal balance:', stdout.trim());
  });
  
  // Step 4: Verify bet-win correlation
  console.log('\n=== STEP 4: Verifying bet-win correlation ===');
  
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "
    SELECT 
      t.external_reference as bet_id,
      b.bet_amount,
      b.win_amount,
      b.outcome,
      w.external_reference as win_id,
      w.amount as win_transaction_amount
    FROM bets b 
    JOIN transactions t ON b.transaction_id = t.id 
    LEFT JOIN transactions w ON w.metadata->>'session_id' = t.metadata->>'session_id' AND w.type = 'win'
    WHERE t.metadata->>'round_id' = '${round_id}'
    ORDER BY b.created_at;
  "`, (error, stdout, stderr) => {
    if (error) {
      console.error('Correlation check error:', error);
      return;
    }
    console.log('Bet-Win correlation:');
    console.log(stdout);
  });
}

testComprehensiveWinFix(); 