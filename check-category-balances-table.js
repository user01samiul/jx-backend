const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Check Category Balances Table
async function checkCategoryBalancesTable() {
  try {
    console.log('🔍 **CHECKING CATEGORY BALANCES TABLE**');
    console.log('=======================================');
    
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
    
    // Check all transactions for user 48 to see if there are any that might have set the balance to 1500
    console.log('\n🕒 **ALL TRANSACTIONS FOR USER 48 (INCLUDING OTHER USERS)**');
    
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (transactionsResponse.data.success && transactionsResponse.data.data) {
      const transactions = transactionsResponse.data.data;
      
      // Find all transactions with balance_before or balance_after around 1500
      const transactionsWith1500 = transactions.filter(t => 
        (t.balance_before && t.balance_before >= 1499 && t.balance_before <= 1501) ||
        (t.balance_after && t.balance_after >= 1499 && t.balance_after <= 1501)
      );
      
      console.log(`Found ${transactionsWith1500.length} transactions with balance around 1500`);
      
      if (transactionsWith1500.length > 0) {
        transactionsWith1500.forEach((t, index) => {
          console.log(`${index + 1}. ID: ${t.id} | User ID: ${t.user_id} | Type: ${t.type}`);
          console.log(`   Amount: $${t.amount} | Balance Before: $${t.balance_before || 'N/A'} | Balance After: $${t.balance_after || 'N/A'}`);
          console.log(`   Description: ${t.description || 'N/A'}`);
          console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
          console.log(`   Created: ${t.created_at}`);
          console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
          console.log('');
        });
      }
      
      // Check if there are any transactions that set balance to exactly 1500
      const balanceSettingTo1500 = transactions.filter(t => 
        t.balance_after && 
        t.balance_after === 1500 &&
        t.balance_before && 
        t.balance_before !== 1500
      );
      
      if (balanceSettingTo1500.length > 0) {
        console.log('🎯 **TRANSACTIONS THAT SET BALANCE TO EXACTLY 1500**');
        balanceSettingTo1500.forEach((t, index) => {
          console.log(`${index + 1}. ID: ${t.id} | User ID: ${t.user_id} | Type: ${t.type}`);
          console.log(`   Balance Before: $${t.balance_before} | Balance After: $${t.balance_after}`);
          console.log(`   Amount: $${t.amount} | Description: ${t.description || 'N/A'}`);
          console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
          console.log(`   Created: ${t.created_at}`);
          console.log('');
        });
      }
      
      // Check for any transactions that might have created the category balance record
      const categoryCreationTransactions = transactions.filter(t => 
        t.type === 'deposit' || 
        t.type === 'transfer' ||
        (t.type === 'adjustment' && t.description && t.description.includes('transfer'))
      );
      
      if (categoryCreationTransactions.length > 0) {
        console.log('🔄 **POTENTIAL CATEGORY BALANCE CREATION TRANSACTIONS**');
        categoryCreationTransactions.slice(0, 10).forEach((t, index) => {
          console.log(`${index + 1}. ID: ${t.id} | User ID: ${t.user_id} | Type: ${t.type}`);
          console.log(`   Amount: $${t.amount} | Balance Before: $${t.balance_before || 'N/A'} | Balance After: $${t.balance_after || 'N/A'}`);
          console.log(`   Description: ${t.description || 'N/A'}`);
          console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
          console.log(`   Created: ${t.created_at}`);
          console.log('');
        });
      }
    }
    
    // Check if there are any other users with similar balance patterns
    console.log('\n👥 **OTHER USERS WITH BALANCE AROUND 1500**');
    
    const allTransactions = transactionsResponse.data.data;
    const usersWith1500Balance = allTransactions.filter(t => 
      (t.balance_before && t.balance_before >= 1499 && t.balance_before <= 1501) ||
      (t.balance_after && t.balance_after >= 1499 && t.balance_after <= 1501)
    ).map(t => t.user_id);
    
    const uniqueUsers = [...new Set(usersWith1500Balance)];
    
    console.log(`Found ${uniqueUsers.length} unique users with balance around 1500: ${uniqueUsers.join(', ')}`);
    
    // Check if user 1 (admin) has any transactions with 1500 balance
    if (uniqueUsers.includes(1)) {
      console.log('\n👑 **ADMIN USER (1) TRANSACTIONS WITH 1500 BALANCE**');
      const adminTransactions = allTransactions.filter(t => 
        t.user_id === 1 && 
        ((t.balance_before && t.balance_before >= 1499 && t.balance_before <= 1501) ||
         (t.balance_after && t.balance_after >= 1499 && t.balance_after <= 1501))
      );
      
      adminTransactions.forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type}`);
        console.log(`   Amount: $${t.amount} | Balance Before: $${t.balance_before || 'N/A'} | Balance After: $${t.balance_after || 'N/A'}`);
        console.log(`   Description: ${t.description || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log(`   Created: ${t.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking category balances table:', error.response?.data || error.message);
  }
}

// Run the check
checkCategoryBalancesTable(); 