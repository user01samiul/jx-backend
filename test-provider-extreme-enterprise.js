const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SECRET_KEY = '2xk3SrX09oQ71Z3F';
const testUser = {
  id: 48,
  token: '7fb2fe26e7dccdb10aa2c0b582270a48' // Fresh token
};

// Generate unique session and round IDs
const timestamp = Date.now();
const sessionId = `session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
const roundId = Math.floor(Math.random() * 1000000) + 1000000;

console.log('🔥🔥🔥🔥🔥 EXTREME ENTERPRISE Provider Burst Test (100 BETS + 100 WINS = 200 Transactions)...\n');

console.log('📊 Extreme Enterprise Burst Configuration:');
console.log(`   Round ID: ${roundId}`);
console.log(`   Session ID: ${sessionId}`);
console.log(`   User ID: ${testUser.id}`);
console.log(`   Game ID: 4`);
console.log(`   Total Transactions: 200 (100 bets + 100 wins)`);
console.log(`   Provider Behavior: Sending ALL 200 requests simultaneously\n`);

// Generate hash for authorization
function generateHash(command, timestamp, secretKey) {
  return crypto.createHash('sha1').update(command + timestamp + secretKey).digest('hex');
}

function generateAuthHeader(command, secretKey) {
  return crypto.createHash('sha1').update(command + secretKey).digest('hex');
}

// Create bet requests
const betRequests = [];
for (let i = 0; i < 100; i++) {
  const betAmount = (Math.random() * 2 + 0.01).toFixed(2);
  const transactionId = 2400000 + i;
  
  const betRequest = {
    command: 'changebalance',
    data: {
      transaction_type: 'BET',
      reason: 'SPIN',
      amount: parseFloat(betAmount),
      currency_code: 'USD',
      transaction_id: transactionId,
      transaction_timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      round_id: roundId,
      round_finished: false,
      game_id: 4,
      user_id: testUser.id.toString(),
      token: testUser.token,
      context: {
        reason: 'SPIN',
        session_id: sessionId,
        history_id: `2-${Math.random().toString(36).substr(2, 8)}`
      }
    },
    request_timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    hash: generateHash('changebalance', new Date().toISOString().slice(0, 19).replace('T', ' '), SECRET_KEY)
  };
  
  betRequests.push({ request: betRequest, amount: betAmount, transactionId });
}

// Create win requests
const winRequests = [];
for (let i = 0; i < 100; i++) {
  const winAmount = (Math.random() * 3 + 0.01).toFixed(2);
  const transactionId = 2410000 + i;
  
  const winRequest = {
    command: 'changebalance',
    data: {
      transaction_type: 'WIN',
      reason: 'WIN',
      amount: parseFloat(winAmount),
      currency_code: 'USD',
      transaction_id: transactionId,
      transaction_timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      round_id: roundId,
      round_finished: false,
      game_id: 4,
      user_id: testUser.id.toString(),
      token: testUser.token,
      context: {
        reason: 'WIN',
        session_id: sessionId,
        history_id: `2-${Math.random().toString(36).substr(2, 8)}`
      }
    },
    request_timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    hash: generateHash('changebalance', new Date().toISOString().slice(0, 19).replace('T', ' '), SECRET_KEY)
  };
  
  winRequests.push({ request: winRequest, amount: winAmount, transactionId });
}

// Combine all requests
const allRequests = [...betRequests, ...winRequests];

async function runExtremeTest() {
  console.log('=== STEP 1: Provider Sends EXTREME ENTERPRISE Burst (100 BETS + 100 WINS) ===');
  console.log('🔥🔥🔥🔥🔥 EXTREME: Provider sending all 200 requests simultaneously...\n');

  console.log('🔥🔥🔥🔥🔥 EXTREME: Sending all 200 requests (100 bets + 100 wins) simultaneously...');

  const startTime = Date.now();
  let balance = 0;
  let betCount = 0;
  let winCount = 0;
  let totalBetAmount = 0;
  let totalWinAmount = 0;

  // Send all requests simultaneously
  const promises = allRequests.map(async ({ request, amount, transactionId }) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/provider/callback`, request, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': generateAuthHeader('changebalance', SECRET_KEY)
      },
      timeout: 60000 // 60 second timeout for enterprise
    });

    const responseData = response.data;
    
    if (responseData.response?.status === 'OK') {
      balance = responseData.response.data.balance;
      
      if (request.data.transaction_type === 'BET') {
        betCount++;
        totalBetAmount += parseFloat(amount);
        console.log(`✅ Bet ${transactionId}: ${amount} USD - Balance: ${balance}`);
      } else if (request.data.transaction_type === 'WIN') {
        winCount++;
        totalWinAmount += parseFloat(amount);
        console.log(`✅ Win ${transactionId}: ${amount} USD - Balance: ${balance}`);
      }
      
      return { success: true, transactionId, amount, balance };
    } else {
      console.log(`❌ Failed ${request.data.transaction_type} ${transactionId}: ${responseData.response?.message || 'Unknown error'}`);
      return { success: false, transactionId, error: responseData.response?.message };
    }
  } catch (error) {
    console.log(`❌ Error ${request.data.transaction_type} ${transactionId}: ${error.message}`);
    return { success: false, transactionId, error: error.message };
  }
});

// Wait for all requests to complete
const results = await Promise.all(promises);
const endTime = Date.now();
const duration = endTime - startTime;

console.log(`\nProvider received ${results.filter(r => r.success).length}/${results.length} total responses in ${duration}ms`);

console.log('\n=== STEP 2: Verifying Bet-Win Correlation ===\n');

// Verify bet-win correlation in database
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

try {
  const { stdout } = await execAsync(`docker exec pg_db psql -U postgres -d jackpotx-db -c "
    SELECT 
      b.id as bet_id,
      b.amount as bet_amount,
      b.win_amount,
      CASE 
        WHEN b.win_amount > 0 THEN 'win'
        WHEN b.win_amount = 0 AND b.status = 'completed' THEN 'loss'
        ELSE 'pending'
      END as outcome,
      t.external_reference as bet_transaction_id,
      b.round_id as bet_round_id
    FROM bets b
    JOIN transactions t ON b.transaction_id = t.id
    WHERE b.round_id = ${roundId}
    ORDER BY b.id
    LIMIT 10;
  "`);

  console.log('📊 Database Bet-Win Correlation Results (First 10 bets):');
  console.log(stdout);
} catch (error) {
  console.log('❌ Error querying database:', error.message);
}

console.log('\n=== STEP 3: Extreme Enterprise Burst Analysis ===');
console.log(`📈 BET Success Rate: ${betCount}/100 (${(betCount/100*100).toFixed(1)}%)`);
console.log(`🎯 WIN Success Rate: ${winCount}/100 (${(winCount/100*100).toFixed(1)}%)`);
console.log(`🔥 TOTAL Success Rate: ${results.filter(r => r.success).length}/200 (${(results.filter(r => r.success).length/200*100).toFixed(1)}%)`);
console.log(`⏱️  Total Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
console.log(`🚀 Average Response Time: ${Math.round(duration/results.length)}ms per transaction`);
console.log(`💰 Round ID: ${roundId}`);
console.log(`🔄 Session ID: ${sessionId}`);
console.log(`💸 Total Bet Amount: $${totalBetAmount.toFixed(2)}`);
console.log(`🏆 Total Win Amount: $${totalWinAmount.toFixed(2)}`);
console.log(`📊 Net Result: $${(totalWinAmount - totalBetAmount).toFixed(2)}`);

const errors = results.filter(r => !r.success);
if (errors.length === 0) {
  console.log('\n✅ No errors detected in extreme enterprise burst call!');
} else {
  console.log(`\n❌ ${errors.length} errors detected:`);
  errors.forEach(error => {
    console.log(`   - ${error.transactionId}: ${error.error}`);
  });
}

console.log('\n=== STEP 4: Enterprise Performance Analysis ===');
const successRate = (results.filter(r => r.success).length/200*100).toFixed(1);
const avgResponseTime = Math.round(duration/results.length);

console.log(`🎯 Target: 100% success rate with < 50ms average response time`);
console.log(`📊 Achieved: ${successRate}% success rate with ${avgResponseTime}ms average response time`);

if (successRate >= 99.5 && avgResponseTime <= 50) {
  console.log('✅ EXCELLENT: Enterprise-level performance achieved!');
} else if (successRate >= 98 && avgResponseTime <= 100) {
  console.log('✅ GOOD: Good performance, minor optimizations possible');
} else {
  console.log('⚠️  NEEDS IMPROVEMENT: Performance below enterprise standards');
}

  console.log('\n🔥🔥🔥🔥🔥 Extreme Enterprise Provider Burst Test Completed!\n');

  console.log('🔍 This test simulates ENTERPRISE provider behavior:');
  console.log('   - 100 BETS and 100 WINS sent simultaneously');
  console.log('   - Maximum enterprise-level concurrency stress');
  console.log('   - Real-world high-traffic casino scenario');
  console.log('   - Complete stress test of enterprise configuration');
}

// Run the test
runExtremeTest().catch(console.error); 