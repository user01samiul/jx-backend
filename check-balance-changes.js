const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Check Balance Changes for User 48
async function checkBalanceChanges() {
  try {
    console.log('💰 **BALANCE CHANGES ANALYSIS FOR USER 48**');
    console.log('==========================================');
    
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
    
    // Filter transactions for user 48
    const user48Transactions = transactions.filter(t => t.user_id === 48);
    
    console.log(`📊 **USER 48 TRANSACTION SUMMARY**`);
    console.log(`Total transactions: ${user48Transactions.length}`);
    
    // Group by type
    const transactionsByType = {};
    user48Transactions.forEach(t => {
      if (!transactionsByType[t.type]) {
        transactionsByType[t.type] = [];
      }
      transactionsByType[t.type].push(t);
    });
    
    console.log('\n📋 **TRANSACTIONS BY TYPE**');
    Object.keys(transactionsByType).forEach(type => {
      console.log(`${type}: ${transactionsByType[type].length} transactions`);
    });
    
    // Show recent transactions (last 10)
    console.log('\n🕒 **RECENT TRANSACTIONS (LAST 10)**');
    user48Transactions.slice(0, 10).forEach((t, index) => {
      console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
      console.log(`   Status: ${t.status} | Created: ${t.created_at}`);
      console.log(`   Description: ${t.description || 'N/A'}`);
      console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
      console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
      console.log('');
    });
    
    // Check for cancel/refund transactions
    const cancelTransactions = user48Transactions.filter(t => 
      t.type === 'adjustment' && 
      t.description && 
      t.description.includes('Cancelled')
    );
    
    console.log('🔄 **CANCEL/REFUND TRANSACTIONS**');
    if (cancelTransactions.length > 0) {
      cancelTransactions.forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | Amount: $${t.amount}`);
        console.log(`   Description: ${t.description}`);
        console.log(`   Created: ${t.created_at}`);
        console.log(`   Original Transaction: ${t.metadata?.original_transaction || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('No cancel/refund transactions found');
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
    
    // Calculate balance from transactions
    console.log('\n🧮 **BALANCE CALCULATION FROM TRANSACTIONS**');
    let calculatedBalance = 0;
    let betTotal = 0;
    let winTotal = 0;
    let depositTotal = 0;
    let adjustmentTotal = 0;
    
    user48Transactions.forEach(t => {
      switch(t.type) {
        case 'deposit':
          calculatedBalance += parseFloat(t.amount);
          depositTotal += parseFloat(t.amount);
          break;
        case 'bet':
          calculatedBalance -= parseFloat(t.amount);
          betTotal += parseFloat(t.amount);
          break;
        case 'win':
          calculatedBalance += parseFloat(t.amount);
          winTotal += parseFloat(t.amount);
          break;
        case 'adjustment':
          calculatedBalance += parseFloat(t.amount);
          adjustmentTotal += parseFloat(t.amount);
          break;
      }
    });
    
    console.log(`Deposits: +$${depositTotal.toFixed(2)}`);
    console.log(`Bets: -$${betTotal.toFixed(2)}`);
    console.log(`Wins: +$${winTotal.toFixed(2)}`);
    console.log(`Adjustments: +$${adjustmentTotal.toFixed(2)}`);
    console.log(`Calculated Balance: $${calculatedBalance.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error checking balance changes:', error.response?.data || error.message);
  }
}

// Run the check
checkBalanceChanges(); 