const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Test Transfer Transactions
async function testTransferTransactions() {
  try {
    console.log('🧪 **TESTING TRANSFER TRANSACTIONS**');
    console.log('====================================');
    
    // Step 1: Check current balance
    console.log('\n💰 **STEP 1: CHECKING CURRENT BALANCE**');
    
    const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (balanceResponse.data.success && balanceResponse.data.data) {
      const data = balanceResponse.data.data;
      console.log('💰 **CURRENT BALANCE**');
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      console.log(`Slot Wallet: $${data.slot_balance || 0}`);
      console.log(`Category Balances:`, data.category_balances || {});
    }
    
    // Step 2: Perform a transfer from main to slot wallet
    console.log('\n🔄 **STEP 2: TRANSFERRING $50 FROM MAIN TO SLOT WALLET**');
    
    const transferResponse = await axios.post(`${BASE_URL}/api/user/category-balance/transfer`, {
      category: 'slots',
      amount: 50,
      direction: 'main_to_category'
    }, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc',
        'Content-Type': 'application/json'
      }
    });

    console.log('📤 **TRANSFER REQUEST**');
    console.log(JSON.stringify({
      category: 'slots',
      amount: 50,
      direction: 'main_to_category'
    }, null, 2));

    console.log('✅ **TRANSFER RESPONSE**');
    console.log(JSON.stringify(transferResponse.data, null, 2));
    
    if (transferResponse.data.success) {
      console.log('🎉 **TRANSFER SUCCESSFUL!**');
      
      // Step 3: Check balance after transfer
      console.log('\n💰 **STEP 3: CHECKING BALANCE AFTER TRANSFER**');
      
      const balanceAfterTransferResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
        }
      });

      if (balanceAfterTransferResponse.data.success && balanceAfterTransferResponse.data.data) {
        const data = balanceAfterTransferResponse.data.data;
        console.log('💰 **BALANCE AFTER TRANSFER**');
        console.log(`Main Wallet: $${data.balance || 0}`);
        console.log(`Total Balance: $${data.total_balance || 0}`);
        console.log(`Slot Wallet: $${data.slot_balance || 0}`);
        console.log(`Category Balances:`, data.category_balances || {});
      }
      
      // Step 4: Check transaction records
      console.log('\n🔍 **STEP 4: CHECKING TRANSACTION RECORDS**');
      
      const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
        }
      });

      if (transactionsResponse.data.success && transactionsResponse.data.data) {
        const transactions = transactionsResponse.data.data;
        
        // Find transfer transactions
        const transferTransactions = transactions.filter(t => 
          t.type === 'adjustment' && 
          t.description && 
          t.description.includes('Transfer')
        );
        
        console.log(`📊 **FOUND ${transferTransactions.length} TRANSFER TRANSACTIONS**`);
        
        if (transferTransactions.length > 0) {
          // Show recent transfer transactions
          transferTransactions.slice(0, 10).forEach((t, index) => {
            console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
            console.log(`   Status: ${t.status} | Created: ${t.created_at}`);
            console.log(`   Balance Before: $${t.balance_before || 'N/A'}`);
            console.log(`   Balance After: $${t.balance_after || 'N/A'}`);
            console.log(`   Description: ${t.description || 'N/A'}`);
            console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
            console.log(`   Direction: ${t.metadata?.direction || 'N/A'}`);
            console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
            console.log('');
          });
          
          // Check if we have both deduction and credit transactions
          const deductionTransactions = transferTransactions.filter(t => t.amount < 0);
          const creditTransactions = transferTransactions.filter(t => t.amount > 0);
          
          console.log(`📉 **DEDUCTION TRANSACTIONS**: ${deductionTransactions.length}`);
          console.log(`📈 **CREDIT TRANSACTIONS**: ${creditTransactions.length}`);
          
          if (deductionTransactions.length > 0 && creditTransactions.length > 0) {
            console.log('✅ **TRANSFER TRANSACTION RECORDS CREATED SUCCESSFULLY!**');
            console.log('   - Deduction transaction recorded');
            console.log('   - Credit transaction recorded');
            console.log('   - Both transactions linked with same external_reference');
          } else {
            console.log('❌ **TRANSFER TRANSACTION RECORDS INCOMPLETE!**');
          }
        } else {
          console.log('❌ **NO TRANSFER TRANSACTIONS FOUND!**');
          console.log('   This means the transfer did not create transaction records');
        }
      }
      
      // Step 5: Transfer back from slot to main wallet
      console.log('\n🔄 **STEP 5: TRANSFERRING $25 BACK FROM SLOT TO MAIN WALLET**');
      
      const transferBackResponse = await axios.post(`${BASE_URL}/api/user/category-balance/transfer`, {
        category: 'slots',
        amount: 25,
        direction: 'category_to_main'
      }, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc',
          'Content-Type': 'application/json'
        }
      });

      console.log('📤 **TRANSFER BACK REQUEST**');
      console.log(JSON.stringify({
        category: 'slots',
        amount: 25,
        direction: 'category_to_main'
      }, null, 2));

      console.log('✅ **TRANSFER BACK RESPONSE**');
      console.log(JSON.stringify(transferBackResponse.data, null, 2));
      
      if (transferBackResponse.data.success) {
        console.log('🎉 **TRANSFER BACK SUCCESSFUL!**');
        
        // Step 6: Check final balance
        console.log('\n💰 **STEP 6: CHECKING FINAL BALANCE**');
        
        const finalBalanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
          }
        });

        if (finalBalanceResponse.data.success && finalBalanceResponse.data.data) {
          const data = finalBalanceResponse.data.data;
          console.log('💰 **FINAL BALANCE**');
          console.log(`Main Wallet: $${data.balance || 0}`);
          console.log(`Total Balance: $${data.total_balance || 0}`);
          console.log(`Slot Wallet: $${data.slot_balance || 0}`);
          console.log(`Category Balances:`, data.category_balances || {});
        }
      }
      
    } else {
      console.log('❌ **TRANSFER FAILED**');
      console.log(`Error: ${transferResponse.data.message || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Error in test transfer transactions:', error.response?.data || error.message);
  }
}

// Run the test
testTransferTransactions(); 