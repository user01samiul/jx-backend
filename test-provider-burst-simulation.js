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

// Simulate provider burst call - exactly how providers call the API
async function simulateProviderBurstCall() {
  console.log('🎮 Simulating Provider Burst Call (Real Provider Behavior)...\n');
  
  const round_id = Math.floor(Math.random() * 1000000) + 1000000;
  const session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('📊 Provider Call Configuration:');
  console.log(`   Round ID: ${round_id}`);
  console.log(`   Session ID: ${session_id}`);
  console.log(`   User ID: ${testUser.user_id}`);
  console.log(`   Game ID: ${testUser.game_id}`);
  console.log(`   Provider Behavior: Sending requests simultaneously without waiting\n`);

  // Step 1: Provider sends multiple BET requests simultaneously (no waiting)
  console.log('=== STEP 1: Provider Sends Multiple BET Requests Simultaneously ===');
  console.log('🔄 Provider behavior: Sending all BET requests at once, not waiting for responses...\n');
  
  const betRequests = [];
  const betAmounts = [0.1, 0.2, 0.3, 0.4, 0.5];
  
  for (let i = 0; i < betAmounts.length; i++) {
    const betAmount = betAmounts[i];
    const transaction_id = 2248000 + i;
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

    // Provider sends request without waiting for response
    const promise = axios.post(`${BASE_URL}/api/innova/changebalance`, betData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': generateXAuthorization('changebalance')
      },
      timeout: 10000
    }).then(response => {
      console.log(`✅ Bet ${transaction_id}: ${betAmount} USD - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      return { transaction_id, betAmount, success: true, response: response.data };
    }).catch(error => {
      console.log(`❌ Bet ${transaction_id}: ${betAmount} USD - ERROR: ${error.response?.data?.response?.data?.error_message || error.message}`);
      return { transaction_id, betAmount, success: false, error: error.message };
    });

    betRequests.push(promise);
  }

  // Provider waits for all BET responses to complete
  console.log('⏳ Provider waiting for all BET responses...');
  const betResults = await Promise.all(betRequests);
  console.log(`✅ Provider received ${betResults.filter(r => r.success).length}/${betResults.length} BET responses\n`);

  // Step 2: Provider sends multiple WIN requests simultaneously (no waiting)
  console.log('=== STEP 2: Provider Sends Multiple WIN Requests Simultaneously ===');
  console.log('🔄 Provider behavior: Sending all WIN requests at once, not waiting for responses...\n');
  
  const winRequests = [];
  const winAmounts = [0.15, 0.35, 0.42, 0.58, 0.75]; // Different amounts for each bet
  
  for (let i = 0; i < winAmounts.length; i++) {
    const winAmount = winAmounts[i];
    const betTransactionId = 2248000 + i;
    const winTransactionId = 2248100 + i;
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

    // Provider sends request without waiting for response
    const promise = axios.post(`${BASE_URL}/api/innova/changebalance`, winData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': generateXAuthorization('changebalance')
      },
      timeout: 10000
    }).then(response => {
      console.log(`✅ Win ${winTransactionId}: ${winAmount.toFixed(2)} USD (for bet ${betTransactionId}) - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      return { winTransactionId, betTransactionId, winAmount, success: true, response: response.data };
    }).catch(error => {
      console.log(`❌ Win ${winTransactionId}: ${winAmount.toFixed(2)} USD (for bet ${betTransactionId}) - ERROR: ${error.response?.data?.response?.data?.error_message || error.message}`);
      return { winTransactionId, betTransactionId, winAmount, success: false, error: error.message };
    });

    winRequests.push(promise);
  }

  // Provider waits for all WIN responses to complete
  console.log('⏳ Provider waiting for all WIN responses...');
  const winResults = await Promise.all(winRequests);
  console.log(`✅ Provider received ${winResults.filter(r => r.success).length}/${winResults.length} WIN responses\n`);

  // Step 3: Verify bet-win correlation in database
  console.log('=== STEP 3: Verifying Bet-Win Correlation ===');
  
  // Wait a moment for database to settle
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const { exec } = require('child_process');
  
  const dbQuery = `
    SELECT 
      b.id as bet_id,
      b.bet_amount,
      b.win_amount,
      b.outcome,
      t.external_reference as bet_transaction_id,
      t.metadata->>'round_id' as bet_round_id
    FROM bets b
    JOIN transactions t ON b.transaction_id = t.id
    WHERE t.external_reference IN ('${Array.from({length: 5}, (_, i) => 2248000 + i).join("','")}')
    ORDER BY b.id;
  `;

  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "${dbQuery}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Database query failed:', error.message);
      return;
    }
    
    console.log('📊 Database Bet-Win Correlation Results:');
    console.log(stdout);
  });

  // Step 4: Check for any errors or inconsistencies
  console.log('\n=== STEP 4: Provider Burst Call Analysis ===');
  
  const successfulBets = betResults.filter(r => r.success).length;
  const successfulWins = winResults.filter(r => r.success).length;
  
  console.log(`📈 Provider BET Success Rate: ${successfulBets}/${betResults.length} (${(successfulBets/betResults.length*100).toFixed(1)}%)`);
  console.log(`🎯 Provider WIN Success Rate: ${successfulWins}/${winResults.length} (${(successfulWins/winResults.length*100).toFixed(1)}%)`);
  
  const totalBetAmount = betAmounts.reduce((sum, amount) => sum + amount, 0);
  const totalWinAmount = winAmounts.reduce((sum, amount) => sum + amount, 0);
  
  console.log(`💰 Round ID: ${round_id}`);
  console.log(`🔄 Session ID: ${session_id}`);
  console.log(`💸 Total Bet Amount: $${totalBetAmount.toFixed(2)}`);
  console.log(`🏆 Total Win Amount: $${totalWinAmount.toFixed(2)}`);
  console.log(`📊 Net Result: $${(totalWinAmount - totalBetAmount).toFixed(2)}`);
  
  // Check for any errors
  const betErrors = betResults.filter(r => !r.success);
  const winErrors = winResults.filter(r => !r.success);
  
  if (betErrors.length > 0) {
    console.log(`\n⚠️  BET Errors Found: ${betErrors.length}`);
    betErrors.forEach(error => {
      console.log(`   - Transaction ${error.transaction_id}: ${error.error}`);
    });
  }
  
  if (winErrors.length > 0) {
    console.log(`\n⚠️  WIN Errors Found: ${winErrors.length}`);
    winErrors.forEach(error => {
      console.log(`   - Transaction ${error.winTransactionId}: ${error.error}`);
    });
  }
  
  if (betErrors.length === 0 && winErrors.length === 0) {
    console.log('\n✅ No errors detected in provider burst call!');
  }
  
  console.log('\n🎮 Provider Burst Call Simulation Completed!');
  console.log('\n🔍 This test simulates exactly how providers call the API:');
  console.log('   - Multiple requests sent simultaneously');
  console.log('   - No waiting between requests');
  console.log('   - Race conditions possible');
  console.log('   - Real provider behavior');
}

// Run the provider simulation
simulateProviderBurstCall().catch(console.error); 