const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';
const testUser = {
  token: '2a916a17408aeda8c753c6e00a27e55e',
  user_id: '48',
  game_id: 4,
  currency: 'USD'
};

// Generate authorization header
function generateXAuthorization(command) {
  const hash = crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
  return hash;
}

// Generate request hash
function generateRequestHash(command, timestamp) {
  const hash = crypto.createHash('sha1').update(command + timestamp + SECRET_KEY).digest('hex');
  return hash;
}

// Test burst transactions with proper locking
async function testBurstLockingFix() {
  console.log('🔒 Testing Burst Transaction Locking Fix...\n');
  
  const round_id = Math.floor(Math.random() * 1000000) + 1000000;
  const session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('📊 Test Configuration:');
  console.log(`   Round ID: ${round_id}`);
  console.log(`   Session ID: ${session_id}`);
  console.log(`   User ID: ${testUser.user_id}`);
  console.log(`   Game ID: ${testUser.game_id}\n`);

  // Step 1: Place multiple bets simultaneously
  console.log('=== STEP 1: Placing Multiple Bets Simultaneously ===');
  const betPromises = [];
  const betAmounts = [0.1, 0.2, 0.3, 0.4, 0.5];
  
  for (let i = 0; i < betAmounts.length; i++) {
    const betAmount = betAmounts[i];
    const transaction_id = 2247000 + i;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const betData = {
      command: 'changebalance',
      data: {
        transaction_type: 'BET',
        reason: 'not_provided',
        amount: betAmount,
        currency_code: testUser.currency,
        transaction_id: transaction_id,
        transaction_timestamp: timestamp,
        round_id: round_id,
        round_finished: false,
        game_id: testUser.game_id,
        user_id: testUser.user_id,
        token: testUser.token,
        context: {
          reason: 'not_provided',
          urid: `WT${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
          history_id: `2-${Math.random().toString(36).substr(2, 16)}`
        }
      },
      request_timestamp: timestamp,
      hash: generateRequestHash('changebalance', timestamp)
    };

    const promise = axios.post(`${BASE_URL}/api/innova/changebalance`, betData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': generateXAuthorization('changebalance')
      },
      timeout: 10000
    }).then(response => {
      console.log(`Bet ${transaction_id}: ${betAmount} USD - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      return { transaction_id, betAmount, response: response.data };
    }).catch(error => {
      console.log(`Bet ${transaction_id}: ${betAmount} USD - ERROR: ${error.response?.data?.response?.data?.error_message || error.message}`);
      return { transaction_id, betAmount, error: error.message };
    });

    betPromises.push(promise);
  }

  // Wait for all bets to complete
  const betResults = await Promise.all(betPromises);
  console.log('\n✅ Placed 5 bets simultaneously\n');

  // Step 2: Process wins for each bet with specific amounts
  console.log('=== STEP 2: Processing Wins for Each Bet ===');
  const winPromises = [];
  const winAmounts = [0.15, 0.35, 0.42, 0.58, 0.75]; // Different amounts for each bet
  
  for (let i = 0; i < winAmounts.length; i++) {
    const winAmount = winAmounts[i];
    const betTransactionId = 2247000 + i;
    const winTransactionId = 2247100 + i;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const winData = {
      command: 'changebalance',
      data: {
        transaction_type: 'WIN',
        reason: 'not_provided',
        amount: winAmount,
        currency_code: testUser.currency,
        transaction_id: winTransactionId,
        transaction_timestamp: timestamp,
        round_id: round_id,
        round_finished: true,
        game_id: testUser.game_id,
        user_id: testUser.user_id,
        token: testUser.token,
        context: {
          reason: 'not_provided',
          urid: `WT${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
          history_id: `2-${Math.random().toString(36).substr(2, 16)}`
        }
      },
      request_timestamp: timestamp,
      hash: generateRequestHash('changebalance', timestamp)
    };

    const promise = axios.post(`${BASE_URL}/api/innova/changebalance`, winData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': generateXAuthorization('changebalance')
      },
      timeout: 10000
    }).then(response => {
      console.log(`Win ${winTransactionId}: ${winAmount.toFixed(2)} USD (for bet ${betTransactionId}) - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      return { winTransactionId, betTransactionId, winAmount, response: response.data };
    }).catch(error => {
      console.log(`Win ${winTransactionId}: ${winAmount.toFixed(2)} USD (for bet ${betTransactionId}) - ERROR: ${error.response?.data?.response?.data?.error_message || error.message}`);
      return { winTransactionId, betTransactionId, winAmount, error: error.message };
    });

    winPromises.push(promise);
  }

  // Wait for all wins to complete
  const winResults = await Promise.all(winPromises);
  console.log('\n✅ Processed 5 wins for each bet\n');

  // Step 3: Verify bet-win correlation in database
  console.log('=== STEP 3: Verifying Bet-Win Correlation ===');
  
  // Use a simple curl command to check the database
  const { exec } = require('child_process');
  
  const dbQuery = `
    SELECT 
      b.id as bet_id,
      b.bet_amount,
      b.win_amount,
      b.outcome,
      t.external_reference as bet_transaction_id,
      t2.external_reference as win_transaction_id,
      t2.amount as win_transaction_amount
    FROM bets b
    JOIN transactions t ON b.transaction_id = t.id
    LEFT JOIN transactions t2 ON t2.metadata::jsonb->>'round_id' = t.metadata::jsonb->>'round_id'
    WHERE t.metadata::jsonb->>'round_id' = '${round_id}'
    AND t.external_reference IN ('${Array.from({length: 5}, (_, i) => 2247000 + i).join("','")}')
    ORDER BY b.id, t2.external_reference;
  `;

  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "${dbQuery}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Database query failed:', error.message);
      return;
    }
    
    console.log('📊 Database Bet-Win Correlation Results:');
    console.log(stdout);
  });

  // Step 4: Summary
  console.log('\n=== STEP 4: Test Summary ===');
  console.log(`📈 Total Bets: ${betResults.length}`);
  console.log(`🎯 Total Wins: ${winResults.length}`);
  console.log(`💰 Round ID: ${round_id}`);
  console.log(`🔄 Session ID: ${session_id}`);
  
  const totalBetAmount = betAmounts.reduce((sum, amount) => sum + amount, 0);
  const totalWinAmount = winAmounts.reduce((sum, amount) => sum + amount, 0);
  
  console.log(`💸 Total Bet Amount: $${totalBetAmount.toFixed(2)}`);
  console.log(`🏆 Total Win Amount: $${totalWinAmount.toFixed(2)}`);
  console.log(`📊 Net Result: $${(totalWinAmount - totalBetAmount).toFixed(2)}`);
  
  console.log('\n✅ Burst Transaction Locking Fix Test Completed!');
  console.log('\n🔒 Expected Result: Each WIN should be correctly matched to its corresponding BET');
  console.log('🔒 Locking Fix: FOR UPDATE SKIP LOCKED should prevent race conditions');
}

// Run the test
testBurstLockingFix().catch(console.error); 