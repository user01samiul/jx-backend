const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Check recent cancel operations and verify the fix
async function checkRecentCancelOperations() {
  try {
    console.log('🔍 **CHECKING RECENT CANCEL OPERATIONS**');
    console.log('=========================================');
    
    // Get recent transactions
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (transactionsResponse.data.success && transactionsResponse.data.data) {
      const transactions = transactionsResponse.data.data;
      
      // Look for recent cancel operations
      const cancelOperations = transactions.filter(t => 
        t.type === 'adjustment' && 
        t.description && 
        t.description.includes('Cancelled')
      );

      console.log(`📊 Found ${cancelOperations.length} recent cancel operations`);
      
      if (cancelOperations.length > 0) {
        console.log('\n🔄 **RECENT CANCEL OPERATIONS**');
        cancelOperations.forEach((op, index) => {
          console.log(`${index + 1}. **CANCEL OPERATION**`);
          console.log(`   Transaction ID: ${op.id}`);
          console.log(`   User: ${op.username} (${op.user_id})`);
          console.log(`   Amount: $${op.amount}`);
          console.log(`   Description: ${op.description}`);
          console.log(`   Balance Before: $${op.balance_before}`);
          console.log(`   Balance After: $${op.balance_after}`);
          console.log(`   Category: ${op.metadata?.category || 'N/A'}`);
          console.log(`   Original Transaction: ${op.metadata?.original_transaction || 'N/A'}`);
          console.log(`   Date: ${op.created_at}`);
          console.log('');
        });
        
        // Check if the fix is working by looking at user distribution
        console.log('📈 **CANCEL OPERATION USER DISTRIBUTION**');
        const userDistribution = {};
        cancelOperations.forEach(op => {
          const userId = op.user_id;
          if (!userDistribution[userId]) {
            userDistribution[userId] = {
              username: op.username,
              count: 0,
              total_amount: 0
            };
          }
          userDistribution[userId].count++;
          userDistribution[userId].total_amount += parseFloat(op.amount);
        });
        
        Object.entries(userDistribution).forEach(([userId, data]) => {
          console.log(`   User ${userId} (${data.username}): ${data.count} cancels, Total: $${data.total_amount.toFixed(2)}`);
        });
        
        // Check if admin is still getting incorrect cancels
        const adminCancels = cancelOperations.filter(op => op.user_id === 1);
        if (adminCancels.length > 0) {
          console.log('\n⚠️ **ADMIN USER STILL GETTING CANCELS**');
          adminCancels.forEach(op => {
            console.log(`   - ${op.description} | Amount: $${op.amount} | Date: ${op.created_at}`);
          });
        } else {
          console.log('\n✅ **ADMIN USER NOT GETTING INCORRECT CANCELS**');
        }
        
        // Check if user 48 (player50) is getting correct cancels
        const player50Cancels = cancelOperations.filter(op => op.user_id === 48);
        if (player50Cancels.length > 0) {
          console.log('\n✅ **USER 48 (PLAYER50) GETTING CORRECT CANCELS**');
          player50Cancels.forEach(op => {
            console.log(`   - ${op.description} | Amount: $${op.amount} | Date: ${op.created_at}`);
          });
        }
        
      } else {
        console.log('❌ No recent cancel operations found');
      }
      
      // Check current balance state
      console.log('\n💰 **CURRENT BALANCE STATE**');
      
      const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
        }
      });

      if (balanceResponse.data.success && balanceResponse.data.data) {
        const data = balanceResponse.data.data;
        console.log('💰 **ADMIN BALANCE SUMMARY**');
        console.log(`Main Wallet: $${data.balance || 0}`);
        console.log(`Total Balance: $${data.total_balance || 0}`);
        console.log(`Slot Wallet: $${data.slot_balance || 0}`);
        console.log(`Category Balances:`, data.category_balances || {});
        
        // Check if slot balance is 49.88 (as mentioned by user)
        if (data.category_balances && data.category_balances.length > 0) {
          const slotsBalance = data.category_balances.find(cat => cat.category === 'slots');
          if (slotsBalance && parseFloat(slotsBalance.balance) === 49.88) {
            console.log('🎯 **SLOT BALANCE IS CORRECTLY 49.88!**');
          } else if (slotsBalance) {
            console.log(`⚠️ **Slot balance is ${slotsBalance.balance}, not 49.88**`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking recent cancel operations:', error.response?.data || error.message);
  }
}

// Run the check
checkRecentCancelOperations(); 