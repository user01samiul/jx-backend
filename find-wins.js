const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Check main wallet balance via API
async function findWinTransactions() {
  try {
    console.log('🔍 **SEARCHING FOR WIN TRANSACTIONS FOR USER 31**');
    console.log('==================================================');
    
    const response = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      },
      params: {
        user_id: 31,
        type: 'win',
        limit: 100,
        page: 1
      }
    });

    console.log('✅ Win Transactions Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.transactions) {
      const wins = response.data.data.transactions;
      console.log(`\n📊 **FOUND ${wins.length} WIN TRANSACTIONS FOR USER 31**`);
      
      let totalWins = 0;
      wins.forEach((win, index) => {
        const amount = parseFloat(win.amount);
        totalWins += amount;
        console.log(`${index + 1}. Transaction ID: ${win.id}`);
        console.log(`   Amount: $${win.amount}`);
        console.log(`   Date: ${win.created_at}`);
        console.log(`   Game: ${win.metadata?.game_id || 'N/A'}`);
        console.log(`   Category: ${win.metadata?.category || 'N/A'}`);
        console.log(`   Description: ${win.description || 'N/A'}`);
        console.log('');
      });
      
      console.log(`💰 **TOTAL WINS: $${totalWins.toFixed(2)}**`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Win Transactions Error:', error.response?.data || error.message);
    return null;
  }
}

// Check all transactions for user 31
async function findAllTransactions() {
  try {
    console.log('🔍 **SEARCHING FOR ALL TRANSACTIONS FOR USER 31**');
    console.log('==================================================');
    
    const response = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      },
      params: {
        user_id: 31,
        limit: 100,
        page: 1
      }
    });

    console.log('✅ All Transactions Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.transactions) {
      const transactions = response.data.data.transactions;
      console.log(`\n📊 **FOUND ${transactions.length} TOTAL TRANSACTIONS FOR USER 31**`);
      
      let totalWins = 0;
      let totalBets = 0;
      let totalAdjustments = 0;
      let totalDeposits = 0;
      
      transactions.forEach((tx, index) => {
        const amount = parseFloat(tx.amount);
        
        if (tx.type === 'win') {
          totalWins += amount;
        } else if (tx.type === 'bet') {
          totalBets += amount;
        } else if (tx.type === 'adjustment') {
          totalAdjustments += amount;
        } else if (tx.type === 'deposit') {
          totalDeposits += amount;
        }
        
        console.log(`${index + 1}. ID: ${tx.id} | Type: ${tx.type} | Amount: $${tx.amount} | Date: ${tx.created_at}`);
        console.log(`   Description: ${tx.description || 'N/A'}`);
        console.log(`   Game: ${tx.metadata?.game_id || 'N/A'} | Category: ${tx.metadata?.category || 'N/A'}`);
        console.log('');
      });
      
      console.log(`💰 **SUMMARY FOR USER 31:**`);
      console.log(`   Total Wins: $${totalWins.toFixed(2)}`);
      console.log(`   Total Bets: $${totalBets.toFixed(2)}`);
      console.log(`   Total Adjustments: $${totalAdjustments.toFixed(2)}`);
      console.log(`   Total Deposits: $${totalDeposits.toFixed(2)}`);
      console.log(`   Net Result: $${(totalWins - totalBets + totalAdjustments + totalDeposits).toFixed(2)}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ All Transactions Error:', error.response?.data || error.message);
    return null;
  }
}

// Check category balance history
async function checkCategoryBalanceHistory() {
  try {
    console.log('🔍 **CHECKING CATEGORY BALANCE HISTORY**');
    console.log('========================================');
    
    const response = await axios.get(`${BASE_URL}/api/admin/user-category-balances`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      },
      params: {
        user_id: 31
      }
    });

    console.log('✅ Category Balance History Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Category Balance History Error:', error.response?.data || error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('💰 **TRANSACTION ANALYSIS FOR USER 31 (player10)**');
  console.log('==================================================');

  // Find win transactions
  await findWinTransactions();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Find all transactions
  await findAllTransactions();
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Check category balance history
  await checkCategoryBalanceHistory();
}

// Run the analysis
main().catch(console.error); 