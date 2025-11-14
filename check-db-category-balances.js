const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Check Database Category Balances for User 48
async function checkDatabaseCategoryBalances() {
  try {
    console.log('💰 **DATABASE CATEGORY BALANCES ANALYSIS FOR USER 48**');
    console.log('=====================================================');
    
    // Get all users to see if we can find category balance info
    const usersResponse = await axios.get(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (!usersResponse.data.success || !usersResponse.data.data) {
      console.log('❌ Failed to get users');
      return;
    }

    const users = usersResponse.data.data;
    
    // Find user 48
    const user48 = users.find(u => u.id === 48);
    
    if (user48) {
      console.log(`👤 **USER 48 DETAILS**`);
      console.log(`ID: ${user48.id}`);
      console.log(`Username: ${user48.username}`);
      console.log(`Email: ${user48.email}`);
      console.log(`Balance: $${user48.balance || 0}`);
      console.log(`Created: ${user48.created_at}`);
      console.log('');
    } else {
      console.log('❌ User 48 not found in users list');
    }
    
    // Check current balance
    console.log('💰 **CURRENT BALANCE**');
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
    
    // Check recent transactions to see if there are any category balance updates
    console.log('\n🕒 **RECENT TRANSACTIONS FOR USER 48**');
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (transactionsResponse.data.success && transactionsResponse.data.data) {
      const transactions = transactionsResponse.data.data;
      const user48Transactions = transactions.filter(t => t.user_id === 48);
      
      console.log(`Total transactions for user 48: ${user48Transactions.length}`);
      
      // Show transactions with balance_before and balance_after
      user48Transactions.slice(0, 10).forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
        console.log(`   Status: ${t.status} | Created: ${t.created_at}`);
        console.log(`   Balance Before: $${t.balance_before || 'N/A'}`);
        console.log(`   Balance After: $${t.balance_after || 'N/A'}`);
        console.log(`   Description: ${t.description || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check if there are any category balance records by looking at transactions
    console.log('🔍 **CATEGORY BALANCE EVIDENCE FROM TRANSACTIONS**');
    const transactionsResponse2 = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (transactionsResponse2.data.success && transactionsResponse2.data.data) {
      const allTransactions = transactionsResponse2.data.data;
      
      // Look for transactions that might show category balance changes
      const categoryTransactions = allTransactions.filter(t => 
        t.metadata?.category && 
        (t.type === 'adjustment' || t.type === 'transfer')
      );
      
      console.log(`Found ${categoryTransactions.length} transactions with category metadata`);
      
      if (categoryTransactions.length > 0) {
        categoryTransactions.slice(0, 5).forEach((t, index) => {
          console.log(`${index + 1}. User ID: ${t.user_id} | Type: ${t.type}`);
          console.log(`   Category: ${t.metadata?.category}`);
          console.log(`   Amount: $${t.amount}`);
          console.log(`   Balance Before: $${t.balance_before || 'N/A'}`);
          console.log(`   Balance After: $${t.balance_after || 'N/A'}`);
          console.log(`   Description: ${t.description || 'N/A'}`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database category balances:', error.response?.data || error.message);
  }
}

// Run the check
checkDatabaseCategoryBalances(); 