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

// Simulate EXTREME provider burst - 100 transactions in multiple rounds
async function simulateExtreme100Burst() {
  console.log('🔥🔥🔥🔥 EXTREME 100-Transaction Provider Burst Test...\n');
  
  const session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('📊 Extreme Burst Configuration:');
  console.log(`   Session ID: ${session_id}`);
  console.log(`   User ID: ${testUser.user_id}`);
  console.log(`   Game ID: ${testUser.game_id}`);
  console.log(`   Total Transactions: 100 (50 bets + 50 wins across multiple rounds)`);
  console.log(`   Provider Behavior: Sending ALL 100 requests simultaneously\n`);

  // Create EXTREME burst - 100 transactions across multiple rounds
  console.log('=== STEP 1: Provider Sends EXTREME Burst (100 Transactions) ===');
  console.log('🔥🔥🔥🔥 EXTREME: Provider sending all 100 requests simultaneously...\n');
  
  const allRequests = [];
  const betAmounts = [];
  const winAmounts = [];
  const roundIds = [];
  
  // Generate 50 unique bet amounts and round IDs
  for (let i = 0; i < 50; i++) {
    betAmounts.push(0.01 + (i * 0.02)); // 0.01, 0.03, 0.05, ..., 0.99
    winAmounts.push(0.01 + (i * 0.02) + (Math.random() * 0.5)); // Win amount = bet amount + random bonus
    roundIds.push(2000000 + i); // Each bet/win pair has its own round_id
  }
  
  // Use unique transaction IDs
  const baseBetId = 2400000 + Math.floor(Math.random() * 10000);
  const baseWinId = 2410000 + Math.floor(Math.random() * 10000);
  
  // Add 50 BET requests (each with different round_id)
  for (let i = 0; i < 50; i++) {
    const betAmount = betAmounts[i];
    const round_id = roundIds[i];
    const transaction_id = baseBetId + i;
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
          history_id: `2-${Math.random().toString(36).substr(2, 16)}`,
          session_id: session_id
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
      timeout: 15000
    }).then(response => {
      console.log(`✅ Bet ${transaction_id}: ${betAmount.toFixed(2)} USD (Round ${round_id}) - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      return { type: 'BET', transaction_id, round_id, amount: betAmount, success: true, response: response.data };
    }).catch(error => {
      console.log(`❌ Bet ${transaction_id}: ${betAmount.toFixed(2)} USD (Round ${round_id}) - ERROR: ${error.response?.data?.response?.data?.error_message || error.message}`);
      return { type: 'BET', transaction_id, round_id, amount: betAmount, success: false, error: error.message };
    });

    allRequests.push(promise);
  }

  // Add 50 WIN requests (each with different round_id)
  for (let i = 0; i < 50; i++) {
    const winAmount = winAmounts[i];
    const round_id = roundIds[i];
    const betTransactionId = baseBetId + i;
    const winTransactionId = baseWinId + i;
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
          history_id: `2-${Math.random().toString(36).substr(2, 16)}`,
          session_id: session_id
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
      timeout: 15000
    }).then(response => {
      console.log(`✅ Win ${winTransactionId}: ${winAmount.toFixed(2)} USD (Round ${round_id}, for bet ${betTransactionId}) - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      return { type: 'WIN', transaction_id: winTransactionId, betTransactionId, round_id, amount: winAmount, success: true, response: response.data };
    }).catch(error => {
      console.log(`❌ Win ${winTransactionId}: ${winAmount.toFixed(2)} USD (Round ${round_id}, for bet ${betTransactionId}) - ERROR: ${error.response?.data?.response?.data?.error_message || error.message}`);
      return { type: 'WIN', transaction_id: winTransactionId, betTransactionId, round_id, amount: winAmount, success: false, error: error.message };
    });

    allRequests.push(promise);
  }

  // Provider sends ALL 100 requests simultaneously and waits for ALL responses
  console.log('🔥🔥🔥🔥 EXTREME: Sending all 100 requests (50 bets + 50 wins) simultaneously...');
  const startTime = Date.now();
  const allResults = await Promise.all(allRequests);
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`✅ Provider received ${allResults.filter(r => r.success).length}/${allResults.length} total responses in ${duration}ms\n`);

  // Step 2: Verify bet-win correlation in database
  console.log('=== STEP 2: Verifying Bet-Win Correlation ===');
  
  // Wait a moment for database to settle
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const { exec } = require('child_process');
  
  // Check first 10 bets for correlation
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
    WHERE t.external_reference IN ('${Array.from({length: 10}, (_, i) => baseBetId + i).join("','")}')
    ORDER BY b.id
    LIMIT 10;
  `;

  exec(`docker exec pg_db psql -U postgres -d jackpotx-db -c "${dbQuery}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Database query failed:', error.message);
      return;
    }
    
    console.log('📊 Database Bet-Win Correlation Results (First 10 bets):');
    console.log(stdout);
  });

  // Step 3: Analyze results
  console.log('\n=== STEP 3: Extreme 100-Transaction Analysis ===');
  
  const betResults = allResults.filter(r => r.type === 'BET');
  const winResults = allResults.filter(r => r.type === 'WIN');
  
  const successfulBets = betResults.filter(r => r.success).length;
  const successfulWins = winResults.filter(r => r.success).length;
  
  console.log(`📈 BET Success Rate: ${successfulBets}/${betResults.length} (${(successfulBets/betResults.length*100).toFixed(1)}%)`);
  console.log(`🎯 WIN Success Rate: ${successfulWins}/${winResults.length} (${(successfulWins/winResults.length*100).toFixed(1)}%)`);
  console.log(`🔥 TOTAL Success Rate: ${allResults.filter(r => r.success).length}/${allResults.length} (${(allResults.filter(r => r.success).length/allResults.length*100).toFixed(1)}%)`);
  console.log(`⏱️  Total Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
  console.log(`🚀 Average Response Time: ${(duration/allResults.length).toFixed(0)}ms per transaction`);
  console.log(`🔄 Unique Rounds: ${new Set(roundIds).size}`);
  
  const totalBetAmount = betAmounts.reduce((sum, amount) => sum + amount, 0);
  const totalWinAmount = winAmounts.reduce((sum, amount) => sum + amount, 0);
  
  console.log(`🔄 Session ID: ${session_id}`);
  console.log(`💸 Total Bet Amount: $${totalBetAmount.toFixed(2)}`);
  console.log(`🏆 Total Win Amount: $${totalWinAmount.toFixed(2)}`);
  console.log(`📊 Net Result: $${(totalWinAmount - totalBetAmount).toFixed(2)}`);
  
  // Check for any errors
  const betErrors = betResults.filter(r => !r.success);
  const winErrors = winResults.filter(r => !r.success);
  
  if (betErrors.length > 0) {
    console.log(`\n⚠️  BET Errors Found: ${betErrors.length}`);
    betErrors.slice(0, 5).forEach(error => {
      console.log(`   - Transaction ${error.transaction_id} (Round ${error.round_id}): ${error.error}`);
    });
    if (betErrors.length > 5) {
      console.log(`   ... and ${betErrors.length - 5} more bet errors`);
    }
  }
  
  if (winErrors.length > 0) {
    console.log(`\n⚠️  WIN Errors Found: ${winErrors.length}`);
    winErrors.slice(0, 5).forEach(error => {
      console.log(`   - Transaction ${error.transaction_id} (Round ${error.round_id}): ${error.error}`);
    });
    if (winErrors.length > 5) {
      console.log(`   ... and ${winErrors.length - 5} more win errors`);
    }
  }
  
  if (betErrors.length === 0 && winErrors.length === 0) {
    console.log('\n✅ No errors detected in extreme 100-transaction burst!');
  }
  
  // Performance analysis
  console.log('\n=== STEP 4: Performance Analysis ===');
  console.log(`🎯 Target: 100% success rate with < 30ms average response time`);
  console.log(`📊 Achieved: ${(allResults.filter(r => r.success).length/allResults.length*100).toFixed(1)}% success rate with ${(duration/allResults.length).toFixed(0)}ms average response time`);
  
  if (allResults.filter(r => r.success).length === allResults.length && (duration/allResults.length) < 30) {
    console.log('🏆 EXCELLENT: All targets achieved!');
  } else if (allResults.filter(r => r.success).length === allResults.length) {
    console.log('✅ GOOD: 100% success rate achieved, but response time could be improved');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT: Some transactions failed');
  }
  
  console.log('\n🔥🔥🔥🔥 Extreme 100-Transaction Provider Burst Test Completed!');
  console.log('\n🔍 This test simulates ULTIMATE provider behavior:');
  console.log('   - 50 BETS and 50 WINS sent simultaneously');
  console.log('   - Each bet/win pair has a unique round_id');
  console.log('   - Maximum race conditions and concurrency stress');
  console.log('   - Ultimate stress test of the burst fix');
}

// Run the extreme 100-transaction burst simulation
simulateExtreme100Burst().catch(console.error); 