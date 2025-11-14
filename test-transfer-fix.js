const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc';

async function testTransferFix() {
  try {
    console.log('=== TESTING TRANSFER FIX ===\n');
    
    // 1. Get current balances before transfer
    console.log('1. Current balances before transfer:');
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
    
    // 2. Perform a test transfer
    console.log('\n2. Performing test transfer (main to slots):');
    const transferAmount = 25;
    
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
    
    // 3. Get balances after transfer
    console.log('\n3. Balances after transfer:');
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
    
    // 4. Check the transaction records
    console.log('\n4. Checking transaction records:');
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (transactionsResponse.data.success && transactionsResponse.data.data) {
      const allTransactions = transactionsResponse.data.data;
      const recentTransactions = allTransactions
        .filter(t => t.user_id === 48)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4);
      
      console.log('Recent transactions for user 48:');
      recentTransactions.forEach((t, index) => {
        console.log(`\nTransaction ${index + 1}:`);
        console.log(`  ID: ${t.id}`);
        console.log(`  Type: ${t.type}`);
        console.log(`  Amount: ${t.amount}`);
        console.log(`  Balance Before: ${t.balance_before}`);
        console.log(`  Balance After: ${t.balance_after}`);
        console.log(`  Description: ${t.description}`);
        console.log(`  External Ref: ${t.external_reference}`);
        
        // Check if balance calculation is correct
        const expectedBalanceAfter = t.balance_before + t.amount;
        if (t.balance_after !== expectedBalanceAfter) {
          console.log(`  ⚠️  BALANCE MISMATCH! Expected: ${expectedBalanceAfter}, Actual: ${t.balance_after}`);
        } else {
          console.log(`  ✅ Balance calculation is correct`);
        }
      });
    }
    
    // 5. Test reverse transfer (slots to main)
    console.log('\n5. Testing reverse transfer (slots to main):');
    const reverseTransferResponse = await axios.post(`${BASE_URL}/api/user/category-balance/transfer`, {
      category: 'slots',
      amount: 10,
      direction: 'category_to_main'
    }, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (reverseTransferResponse.data.success) {
      console.log('✅ Reverse transfer successful!');
      console.log(`Transfer ID: ${reverseTransferResponse.data.data.transfer_id}`);
      console.log(`New Main Balance: $${reverseTransferResponse.data.data.main_balance}`);
      console.log(`New Category Balance: $${reverseTransferResponse.data.data.category_balance}`);
    } else {
      console.log('❌ Reverse transfer failed:', reverseTransferResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing transfer fix:', error.response?.data || error.message);
  }
}

testTransferFix().catch(console.error); 