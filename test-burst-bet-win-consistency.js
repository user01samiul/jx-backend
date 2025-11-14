const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';
const testUser = {
  token: '2a916a17408aeda8c753c6e00a27e55e',
  user_id: '48',
  game_id: 18,
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

// Test burst bet and win consistency
async function testBurstBetWinConsistency() {
  console.log('🚀 Starting Burst Bet-Win Consistency Test...\n');
  
  const round_id = Math.floor(Math.random() * 1000000) + 1000000;
  const session_id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`📊 Test Configuration:`);
  console.log(`   Round ID: ${round_id}`);
  console.log(`   Session ID: ${session_id}`);
  console.log(`   User ID: ${testUser.user_id}`);
  console.log(`   Game ID: ${testUser.game_id}\n`);
  
  // Step 1: Place multiple bets in burst
  console.log('=== STEP 1: Placing Multiple Bets ===');
  const betAmounts = [0.20, 0.35, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00, 2.50];
  const betTransactions = [];
  
  for (let i = 0; i < betAmounts.length; i++) {
    const betAmount = betAmounts[i];
    const transaction_id = 2246000 + i;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const betData = {
      command: 'changebalance',
      data: {
        transaction_type: 'BET',
        reason: 'SPIN',
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
          reason: 'SPIN',
          urid: `WT${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
          history_id: `2-${Math.random().toString(36).substr(2, 16)}`
        }
      },
      request_timestamp: timestamp,
      hash: generateRequestHash('changebalance', timestamp)
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/api/innova/changebalance`, betData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': generateXAuthorization('changebalance')
        },
        timeout: 10000
      });
      
      console.log(`Bet ${transaction_id}: ${betAmount} USD - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      betTransactions.push({
        transaction_id: transaction_id,
        bet_amount: betAmount,
        balance: response.data.response?.data?.balance || 0,
        response: response.data
      });
      
      // Small delay between bets to simulate real burst
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.log(`❌ Bet ${transaction_id} failed: ${error.response?.data?.response?.data?.error_message || error.message}`);
    }
  }
  
  console.log(`\n✅ Placed ${betTransactions.length} bets successfully\n`);
  
  // Step 2: Process wins for each bet
  console.log('=== STEP 2: Processing Wins ===');
  const winTransactions = [];
  
  for (let i = 0; i < betTransactions.length; i++) {
    const bet = betTransactions[i];
    const winAmount = bet.bet_amount * (0.5 + Math.random() * 1.5); // Random win between 50% and 200% of bet
    const transaction_id = 2246100 + i;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const winData = {
      command: 'changebalance',
      data: {
        transaction_type: 'WIN',
        reason: 'SPIN',
        amount: winAmount,
        currency_code: testUser.currency,
        transaction_id: transaction_id,
        transaction_timestamp: timestamp,
        round_id: round_id,
        round_finished: true,
        game_id: testUser.game_id,
        user_id: testUser.user_id,
        token: testUser.token,
        context: {
          reason: 'SPIN',
          urid: `WT${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
          history_id: `2-${Math.random().toString(36).substr(2, 16)}`
        }
      },
      request_timestamp: timestamp,
      hash: generateRequestHash('changebalance', timestamp)
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/api/innova/changebalance`, winData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': generateXAuthorization('changebalance')
        },
        timeout: 10000
      });
      
      console.log(`Win ${transaction_id}: ${winAmount.toFixed(2)} USD (for bet ${bet.transaction_id}) - Balance: ${response.data.response?.data?.balance || 'N/A'}`);
      winTransactions.push({
        transaction_id: transaction_id,
        win_amount: winAmount,
        bet_transaction_id: bet.transaction_id,
        bet_amount: bet.bet_amount,
        balance: response.data.response?.data?.balance || 0,
        response: response.data
      });
      
      // Small delay between wins
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.log(`❌ Win ${transaction_id} failed: ${error.response?.data?.response?.data?.error_message || error.message}`);
    }
  }
  
  console.log(`\n✅ Processed ${winTransactions.length} wins successfully\n`);
  
  // Step 3: Verify bet-win correlation in database
  console.log('=== STEP 3: Verifying Bet-Win Correlation ===');
  
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const query = `
      SELECT 
        b.id as bet_id,
        b.bet_amount,
        b.win_amount,
        b.outcome,
        t.external_reference as bet_transaction_id,
        w.external_reference as win_transaction_id,
        w.amount as win_transaction_amount
      FROM bets b 
      JOIN transactions t ON b.transaction_id = t.id 
      LEFT JOIN transactions w ON w.metadata->>'round_id' = t.metadata->>'round_id' AND w.type = 'win'
      WHERE t.metadata->>'round_id' = '${round_id}'
      ORDER BY b.created_at;
    `;
    
    const { stdout } = await execAsync(`docker exec pg_db psql -U postgres -d jackpotx-db -c "${query}"`);
    
    console.log('📊 Database Bet-Win Correlation Results:');
    console.log(stdout);
    
  } catch (error) {
    console.log('❌ Failed to query database:', error.message);
  }
  
  // Step 4: Summary
  console.log('=== STEP 4: Test Summary ===');
  console.log(`📈 Total Bets: ${betTransactions.length}`);
  console.log(`🎯 Total Wins: ${winTransactions.length}`);
  console.log(`💰 Round ID: ${round_id}`);
  console.log(`🔄 Session ID: ${session_id}`);
  
  // Calculate total bet and win amounts
  const totalBetAmount = betTransactions.reduce((sum, bet) => sum + bet.bet_amount, 0);
  const totalWinAmount = winTransactions.reduce((sum, win) => sum + win.win_amount, 0);
  
  console.log(`💸 Total Bet Amount: $${totalBetAmount.toFixed(2)}`);
  console.log(`🏆 Total Win Amount: $${totalWinAmount.toFixed(2)}`);
  console.log(`📊 Net Result: $${(totalWinAmount - totalBetAmount).toFixed(2)}`);
  
  console.log('\n✅ Burst Bet-Win Consistency Test Completed!');
}

// Run the test
testBurstBetWinConsistency().catch(console.error);
