const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Check User 48 Status
async function checkUser48Status() {
  try {
    console.log('🔍 **USER 48 STATUS CHECK**');
    console.log('==========================');
    
    // Get all transactions
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (!transactionsResponse.data.success || !transactionsResponse.data.data) {
      console.log('❌ Failed to get transactions');
      return;
    }

    const transactions = transactionsResponse.data.data;
    
    // Filter for user 48
    const user48Transactions = transactions.filter(t => t.user_id === 48);
    
    console.log(`📊 **USER 48 TRANSACTION SUMMARY**`);
    console.log(`Total transactions: ${user48Transactions.length}`);
    
    // Group by type and status
    const transactionSummary = {};
    user48Transactions.forEach(t => {
      const key = `${t.type}_${t.status}`;
      if (!transactionSummary[key]) {
        transactionSummary[key] = [];
      }
      transactionSummary[key].push(t);
    });
    
    console.log('\n📋 **TRANSACTIONS BY TYPE AND STATUS**');
    Object.keys(transactionSummary).forEach(key => {
      const [type, status] = key.split('_');
      console.log(`${type} (${status}): ${transactionSummary[key].length} transactions`);
    });
    
    // Show recent transactions with balance info
    console.log('\n🕒 **RECENT TRANSACTIONS WITH BALANCE INFO**');
    user48Transactions.slice(0, 10).forEach((t, index) => {
      console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
      console.log(`   Status: ${t.status} | Created: ${t.created_at}`);
      console.log(`   Balance Before: $${t.balance_before || 'N/A'}`);
      console.log(`   Balance After: $${t.balance_after || 'N/A'}`);
      console.log(`   Description: ${t.description || 'N/A'}`);
      console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
      console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
      console.log('');
    });
    
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
    
    // Check if there are any bet transactions that can be cancelled
    const cancellableBets = user48Transactions.filter(t => 
      t.type === 'bet' && 
      t.status !== 'cancelled' && 
      t.external_reference
    );
    
    console.log(`\n🎯 **CANCELLABLE BET TRANSACTIONS**`);
    console.log(`Found ${cancellableBets.length} bet transactions that can be cancelled`);
    
    if (cancellableBets.length > 0) {
      cancellableBets.forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | Amount: $${t.amount}`);
        console.log(`   External Ref: ${t.external_reference}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log(`   Created: ${t.created_at}`);
        console.log('');
      });
    } else {
      console.log('No bet transactions available for cancellation');
    }
    
  } catch (error) {
    console.error('❌ Error checking user 48 status:', error.response?.data || error.message);
  }
}

// Run the check
checkUser48Status(); 