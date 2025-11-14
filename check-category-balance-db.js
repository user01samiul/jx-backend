const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Check Category Balance in Database
async function checkCategoryBalanceDB() {
  try {
    console.log('🔍 **CHECKING CATEGORY BALANCE IN DATABASE**');
    console.log('===========================================');
    
    // Check current balance
    console.log('\n💰 **CURRENT BALANCE**');
    const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (balanceResponse.data.success && balanceResponse.data.data) {
      const data = balanceResponse.data.data;
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      console.log(`Slot Wallet: $${data.slot_balance || 0}`);
      console.log(`Category Balances:`, data.category_balances || {});
    }
    
    // Check all recent transactions for user 48 to see the pattern
    console.log('\n🕒 **ALL RECENT TRANSACTIONS FOR USER 48**');
    
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (transactionsResponse.data.success && transactionsResponse.data.data) {
      const transactions = transactionsResponse.data.data;
      const user48Transactions = transactions.filter(t => t.user_id === 48);
      
      // Show all transactions with balance info in chronological order
      user48Transactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      console.log(`Total transactions for user 48: ${user48Transactions.length}`);
      
      user48Transactions.forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
        console.log(`   Status: ${t.status} | Created: ${t.created_at}`);
        console.log(`   Balance Before: $${t.balance_before || 'N/A'}`);
        console.log(`   Balance After: $${t.balance_after || 'N/A'}`);
        console.log(`   Description: ${t.description || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
        console.log('');
      });
      
      // Find the exact point where balance jumps to 1500
      console.log('🔍 **BALANCE JUMP ANALYSIS**');
      
      for (let i = 1; i < user48Transactions.length; i++) {
        const prev = user48Transactions[i - 1];
        const curr = user48Transactions[i];
        
        if (prev.balance_after && curr.balance_before) {
          const jump = Math.abs(curr.balance_before - prev.balance_after);
          if (jump > 1.0) {
            console.log(`❌ **BALANCE JUMP DETECTED** between transactions ${i} and ${i + 1}`);
            console.log(`   Previous transaction: ID ${prev.id} | Balance After: $${prev.balance_after}`);
            console.log(`   Current transaction: ID ${curr.id} | Balance Before: $${curr.balance_before}`);
            console.log(`   Jump amount: $${jump}`);
            console.log(`   Previous type: ${prev.type} | Current type: ${curr.type}`);
            console.log('');
          }
        }
      }
      
      // Check if there are any transactions that set balance to 1500
      const balanceSettingTransactions = user48Transactions.filter(t => 
        t.balance_after && 
        (t.balance_after >= 1499 && t.balance_after <= 1501) &&
        t.balance_before && 
        t.balance_before < 1499
      );
      
      if (balanceSettingTransactions.length > 0) {
        console.log('🎯 **TRANSACTIONS THAT SET BALANCE TO ~1500**');
        balanceSettingTransactions.forEach((t, index) => {
          console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type}`);
          console.log(`   Balance Before: $${t.balance_before} | Balance After: $${t.balance_after}`);
          console.log(`   Amount: $${t.amount} | Description: ${t.description || 'N/A'}`);
          console.log(`   Created: ${t.created_at}`);
          console.log('');
        });
      }
      
      // Check if there are any transactions with balance_before around 1500 but balance_after around 50
      const balanceDroppingTransactions = user48Transactions.filter(t => 
        t.balance_before && 
        (t.balance_before >= 1499 && t.balance_before <= 1501) &&
        t.balance_after && 
        t.balance_after < 100
      );
      
      if (balanceDroppingTransactions.length > 0) {
        console.log('📉 **TRANSACTIONS THAT DROP BALANCE FROM ~1500 TO ~50**');
        balanceDroppingTransactions.forEach((t, index) => {
          console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type}`);
          console.log(`   Balance Before: $${t.balance_before} | Balance After: $${t.balance_after}`);
          console.log(`   Amount: $${t.amount} | Description: ${t.description || 'N/A'}`);
          console.log(`   Created: ${t.created_at}`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking category balance in database:', error.response?.data || error.message);
  }
}

// Run the check
checkCategoryBalanceDB(); 