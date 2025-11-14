const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc';

async function debugBalanceDiscrepancy() {
  try {
    console.log('=== DEBUGGING BALANCE DISCREPANCY ===\n');
    
    // 1. Get current balances via API
    console.log('1. Current balances via API:');
    const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (balanceResponse.data.success && balanceResponse.data.data) {
      const data = balanceResponse.data.data;
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      if (data.categories && data.categories.category_balances) {
        console.log('Category Balances:');
        data.categories.category_balances.forEach(cat => {
          console.log(`  ${cat.category}: $${cat.balance}`);
        });
      }
    }
    
    // 2. Get category balances via separate endpoint
    console.log('\n2. Category balances via separate endpoint:');
    const categoryBalanceResponse = await axios.get(`${BASE_URL}/api/user/category-balances`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (categoryBalanceResponse.data.success && categoryBalanceResponse.data.data) {
      console.log('Category Balances:');
      categoryBalanceResponse.data.data.forEach(cat => {
        console.log(`  ${cat.category}: $${cat.balance}`);
      });
    }
    
    // 3. Get recent transactions to understand the flow
    console.log('\n3. Recent transactions:');
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (transactionsResponse.data.success && transactionsResponse.data.data) {
      const allTransactions = transactionsResponse.data.data;
      const user48Transactions = allTransactions
        .filter(t => t.user_id === 48)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6);
      
      console.log('Recent transactions for user 48:');
      user48Transactions.forEach((t, index) => {
        console.log(`\nTransaction ${index + 1}:`);
        console.log(`  ID: ${t.id}`);
        console.log(`  Type: ${t.type}`);
        console.log(`  Amount: ${t.amount}`);
        console.log(`  Balance Before: ${t.balance_before}`);
        console.log(`  Balance After: ${t.balance_after}`);
        console.log(`  Description: ${t.description}`);
        console.log(`  Category: ${t.metadata?.category || 'N/A'}`);
        console.log(`  External Ref: ${t.external_reference || 'N/A'}`);
        console.log(`  Created: ${t.created_at}`);
      });
    }
    
    // 4. Perform a small test transfer
    console.log('\n4. Performing test transfer:');
    const transferAmount = 5;
    
    const transferResponse = await axios.post(`${BASE_URL}/api/user/category-balance/transfer`, {
      category: 'slots',
      amount: transferAmount,
      direction: 'main_to_category'
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (transferResponse.data.success) {
      console.log('✅ Transfer successful!');
      console.log(`Transfer ID: ${transferResponse.data.data.transfer_id}`);
      console.log(`New Main Balance: $${transferResponse.data.data.main_balance}`);
      console.log(`New Category Balance: $${transferResponse.data.data.category_balance}`);
    } else {
      console.log('❌ Transfer failed:', transferResponse.data.message);
      return;
    }
    
    // 5. Wait a moment and check balances again
    console.log('\n5. Checking balances after transfer:');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const balanceAfterResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (balanceAfterResponse.data.success && balanceAfterResponse.data.data) {
      const data = balanceAfterResponse.data.data;
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      if (data.categories && data.categories.category_balances) {
        console.log('Category Balances:');
        data.categories.category_balances.forEach(cat => {
          console.log(`  ${cat.category}: $${cat.balance}`);
        });
      }
    }
    
    // 6. Check if the transfer response matches the balance API
    console.log('\n6. Comparing transfer response vs balance API:');
    const transferData = transferResponse.data.data;
    const balanceData = balanceAfterResponse.data.data;
    
    console.log('Transfer Response:');
    console.log(`  Main Balance: $${transferData.main_balance}`);
    console.log(`  Category Balance: $${transferData.category_balance}`);
    
    console.log('\nBalance API Response:');
    console.log(`  Main Balance: $${balanceData.balance || 0}`);
    const categoryBalance = balanceData.categories?.category_balances?.find(c => c.category === 'slots')?.balance || 0;
    console.log(`  Slots Balance: $${categoryBalance}`);
    
    // Check for discrepancies
    if (transferData.main_balance !== parseFloat(balanceData.balance || 0)) {
      console.log(`\n⚠️  MAIN BALANCE MISMATCH!`);
      console.log(`  Transfer says: $${transferData.main_balance}`);
      console.log(`  Balance API says: $${balanceData.balance || 0}`);
    } else {
      console.log(`\n✅ Main balance matches`);
    }
    
    if (transferData.category_balance !== parseFloat(categoryBalance)) {
      console.log(`\n⚠️  CATEGORY BALANCE MISMATCH!`);
      console.log(`  Transfer says: $${transferData.category_balance}`);
      console.log(`  Balance API says: $${categoryBalance}`);
    } else {
      console.log(`\n✅ Category balance matches`);
    }
    
  } catch (error) {
    console.error('❌ Error debugging balance discrepancy:', error.response?.data || error.message);
  }
}

debugBalanceDiscrepancy().catch(console.error); 