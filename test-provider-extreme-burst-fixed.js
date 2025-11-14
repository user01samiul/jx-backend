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

// Simulate extreme provider burst with unique transaction IDs
async function simulateExtremeProviderBurstFixed() {
  console.log('🔥 Testing EXTREME Provider Burst with BURST_FIX...\n');
  
  const round_id = Math.floor(Math.random() * 1000000) + 1000000;
  const session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('📊 Extreme Burst Configuration:');
  console.log(`   Round ID: ${round_id}`);
  console.log(`   Session ID: ${session_id}`);
  console.log(`   User ID: ${testUser.user_id}`);
  console.log(`   Game ID: ${testUser.game_id}`);
  console.log(`   Provider Behavior: Sending BETS and WINS in the SAME burst simultaneously\n`);

  // Create all requests (bets and wins) in the same burst with unique transaction IDs
  console.log('=== STEP 1: Provider Sends BETS and WINS in Same Burst ===');
  console.log('🔥 EXTREME: Provider sending all requests (bets + wins) simultaneously...\n');
  
  const allRequests = [];
  const betAmounts = [0.1, 0.2, 0.3, 0.4, 0.5];
  const winAmounts = [0.15, 0.35, 0.42, 0.58, 0.75];
  
  // Use unique transaction IDs
  const baseBetId = 2250000 + Math.floor(Math.random() * 1000);
  const baseWinId = 2251000 + Math.floor(Math.random() * 1000);
  
  // Add BET requests
  for (let i = 0; i < betAmounts.length; i++) {
    const betAmount = betAmounts[i];
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
      console.log(`✅ Bet ${transaction_id}: ${betAmount} USD - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      return { type: 'BET', transaction_id, amount: betAmount, success: true, response: response.data };
    }).catch(error => {
      console.log(`❌ Bet ${transaction_id}: ${betAmount} USD - ERROR: ${error.response?.data?.response?.data?.error_message || error.message}`);
      return { type: 'BET', transaction_id, amount: betAmount, success: false, error: error.message };
    });

    allRequests.push(promise);
  }

  // Add WIN requests (in the same burst!)
  for (let i = 0; i < winAmounts.length; i++) {
    const winAmount = winAmounts[i];
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
      console.log(`✅ Win ${winTransactionId}: ${winAmount.toFixed(2)} USD (for bet ${betTransactionId}) - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      return { type: 'WIN', transaction_id: winTransactionId, betTransactionId, amount: winAmount, success: true, response: response.data };
    }).catch(error => {
      console.log(`❌ Win ${winTransactionId}: ${winAmount.toFixed(2)} USD (for bet ${betTransactionId}) - ERROR: ${error.response?.data?.response?.data?.error_message || error.message}`);
      return { type: 'WIN', transaction_id: winTransactionId, betTransactionId, amount: winAmount, success: false, error: error.message };
    });

    allRequests.push(promise);
  }

  // Provider sends ALL requests simultaneously and waits for ALL responses
  console.log('🔥 EXTREME: Sending all 10 requests (5 bets + 5 wins) simultaneously...');
  const allResults = await Promise.all(allRequests);
  console.log(`✅ Provider received ${allResults.filter(r => r.success).length}/${allResults.length} total responses\n`);

  // Step 2: Verify bet-win correlation in database
  console.log('=== STEP 2: Verifying Bet-Win Correlation ===');
  
  // Wait a moment for database to settle
  await new Promise(resolve => setTimeout(resolve, 3000));
  
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
    WHERE t.external_reference IN ('${Array.from({length: 5}, (_, i) => baseBetId + i).join("','")}')
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

  // Step 3: Analyze results
  console.log('\n=== STEP 3: Extreme Burst Analysis ===');
  
  const betResults = allResults.filter(r => r.type === 'BET');
  const winResults = allResults.filter(r => r.type === 'WIN');
  
  const successfulBets = betResults.filter(r => r.success).length;
  const successfulWins = winResults.filter(r => r.success).length;
  
  console.log(`📈 BET Success Rate: ${successfulBets}/${betResults.length} (${(successfulBets/betResults.length*100).toFixed(1)}%)`);
  console.log(`🎯 WIN Success Rate: ${successfulWins}/${winResults.length} (${(successfulWins/winResults.length*100).toFixed(1)}%)`);
  console.log(`🔥 TOTAL Success Rate: ${allResults.filter(r => r.success).length}/${allResults.length} (${(allResults.filter(r => r.success).length/allResults.length*100).toFixed(1)}%)`);
  
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
      console.log(`   - Transaction ${error.transaction_id}: ${error.error}`);
    });
  }
  
  if (betErrors.length === 0 && winErrors.length === 0) {
    console.log('\n✅ No errors detected in extreme burst call!');
  }
  
  console.log('\n🔥 Extreme Provider Burst Test with BURST_FIX Completed!');
  console.log('\n🔍 This test simulates the WORST-CASE scenario with the fix:');
  console.log('   - BETS and WINS sent in the SAME burst');
  console.log('   - Maximum race conditions possible');
  console.log('   - BURST_FIX should handle session-based bet finding');
  console.log('   - Real provider edge case behavior');
}

// Run the extreme burst simulation
simulateExtremeProviderBurstFixed().catch(console.error); 