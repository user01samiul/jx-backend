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

async function testBurstBalance() {
  const token = '3ca0a36a0ceb7a2befda77a6a934b9bf'; // Valid token for user 48
  const round_id = '1355700'; // New round for testing
  
  console.log('=== BURST BALANCE TEST ===\n');
  
  // Step 1: Place 20 bets rapidly
  console.log('=== STEP 1: Placing 20 burst bets ===');
  const bets = [];
  
  const betAmounts = [1.00, 2.50, 3.75, 5.00, 7.25, 4.50, 6.80, 2.20, 8.90, 3.30, 
                     1.50, 2.80, 4.20, 6.10, 3.90, 5.70, 2.40, 7.60, 4.80, 3.10];
  
  const betPromises = betAmounts.map(async (amount, index) => {
    const betData = {
      transaction_id: `224900${index}`,
      amount: amount,
      urid: `WT081121000000${index}test99`,
      history_id: `2-burst${index}`
    };
    
    const timestamp = new Date(Date.now() + index * 10).toISOString().replace('T', ' ').substring(0, 19);
    
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
      return { success: true, betData, balance: response.data.response.data.balance };
    } catch (error) {
      console.error(`Error with bet ${betData.transaction_id}:`, error.response ? error.response.data : error.message);
      return { success: false, betData, error: error.message };
    }
  });
  
  const betResults = await Promise.all(betPromises);
  const successfulBets = betResults.filter(result => result.success);
  
  console.log(`\n✅ Successfully placed ${successfulBets.length} out of ${betAmounts.length} bets`);
  
  // Wait for bets to be processed
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 2: Process wins for each successful bet
  console.log('\n=== STEP 2: Processing burst wins ===');
  
  const winMultipliers = [1.2, 1.5, 0.8, 2.1, 1.7, 1.3, 1.9, 0.5, 2.5, 1.1,
                         1.4, 1.6, 0.9, 1.8, 1.2, 2.0, 0.7, 2.2, 1.5, 1.3];
  
  const winPromises = successfulBets.map(async (betResult, index) => {
    const bet = betResult.betData;
    const winAmount = bet.amount * winMultipliers[index];
    
    const winData = {
      transaction_id: `224910${index}`,
      amount: winAmount,
      urid: bet.urid, // Same session as the bet
      history_id: `2-win${index}`
    };
    
    const timestamp = new Date(Date.now() + index * 10).toISOString().replace('T', ' ').substring(0, 19);
    
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
      return { success: true, winData, balance: response.data.response.data.balance };
    } catch (error) {
      console.error(`Error with win ${winData.transaction_id}:`, error.response ? error.response.data : error.message);
      return { success: false, winData, error: error.message };
    }
  });
  
  const winResults = await Promise.all(winPromises);
  const successfulWins = winResults.filter(result => result.success);
  
  console.log(`\n✅ Successfully processed ${successfulWins.length} out of ${successfulBets.length} wins`);
  
  // Wait for wins to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Comprehensive verification
  console.log('\n=== STEP 3: Comprehensive verification ===');
  
  const { exec } = require('child_process');
  
  // Check final balance
  exec('docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT balance FROM user_category_balances WHERE user_id = 48;"', (error, stdout, stderr) => {
    if (error) {
      console.error('Balance check error:', error);
      return;
    }
    console.log('Final database balance:', stdout.trim());
  });
  
  // Check transaction count
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT COUNT(*) as total_transactions FROM transactions WHERE metadata->>'round_id' = '${round_id}';"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Transaction count error:', error);
      return;
    }
    console.log('\nTotal transactions for round:', stdout.trim());
  });
  
  // Check bet count
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT COUNT(*) as total_bets FROM bets b JOIN transactions t ON b.transaction_id = t.id WHERE t.metadata->>'round_id' = '${round_id}';"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Bet count error:', error);
      return;
    }
    console.log('Total bets for round:', stdout.trim());
  });
  
  // Check win count
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT COUNT(*) as total_wins FROM transactions WHERE metadata->>'round_id' = '${round_id}' AND type = 'win';"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Win count error:', error);
      return;
    }
    console.log('Total wins for round:', stdout.trim());
  });
  
  // Check for any missing balance_after values
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT COUNT(*) as missing_balance_count FROM transactions WHERE balance_after IS NULL AND metadata->>'round_id' = '${round_id}';"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Missing balance check error:', error);
      return;
    }
    console.log('Missing balance_after count:', stdout.trim());
  });
  
  // Check bet-win correlation
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "
    SELECT 
      COUNT(*) as bets_with_wins,
      COUNT(CASE WHEN b.win_amount > 0 THEN 1 END) as bets_with_win_amount,
      COUNT(CASE WHEN b.outcome = 'win' THEN 1 END) as bets_with_win_outcome
    FROM bets b 
    JOIN transactions t ON b.transaction_id = t.id 
    WHERE t.metadata->>'round_id' = '${round_id}';
  "`, (error, stdout, stderr) => {
    if (error) {
      console.error('Correlation check error:', error);
      return;
    }
    console.log('\nBet-Win correlation summary:');
    console.log(stdout);
  });
  
  // Show sample transactions
  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT external_reference, type, amount, balance_after FROM transactions WHERE metadata->>'round_id' = '${round_id}' ORDER BY created_at LIMIT 10;"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Sample transactions error:', error);
      return;
    }
    console.log('\nSample transactions (first 10):');
    console.log(stdout);
  });
}

testBurstBalance(); 