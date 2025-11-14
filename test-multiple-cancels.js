const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Test Multiple Cancels
async function testMultipleCancels() {
  try {
    console.log('🧪 **TESTING MULTIPLE CANCEL OPERATIONS**');
    console.log('==========================================');
    
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    const OPERATOR_ID = 'thinkcode_stg';
    
    // Create multiple bet transactions first
    const betTransactions = [];
    
    for (let i = 1; i <= 3; i++) {
      console.log(`\n🎯 **CREATING BET TRANSACTION ${i}**`);
      
      const command = 'changebalance';
      const request_timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const transaction_id = `test_bet_${i}_${Date.now()}`;
      
      // Generate request hash
      const requestHash = crypto.createHash('sha1')
        .update(command + request_timestamp + SECRET_KEY)
        .digest('hex');
      
      // Generate authorization header
      const authHash = crypto.createHash('sha1')
        .update(command + SECRET_KEY)
        .digest('hex');
      
      // Create bet request
      const betRequest = {
        command: command,
        request_timestamp: request_timestamp,
        hash: requestHash,
        data: {
          user_id: "48",
          game_id: "1",
          amount: "-0.20",
          session_id: `session_${i}_${Date.now()}`,
          transaction_id: transaction_id,
          category: "slots"
        }
      };

      try {
        const betResponse = await axios.post(`${BASE_URL}/api/provider-callback`, betRequest, {
          headers: {
            'X-Authorization': authHash,
            'X-Operator-Id': OPERATOR_ID,
            'Content-Type': 'application/json'
          }
        });

        if (betResponse.data.response?.status === 'OK') {
          console.log(`✅ Bet transaction ${i} created: ${transaction_id}`);
          betTransactions.push(transaction_id);
        } else {
          console.log(`❌ Bet transaction ${i} failed`);
        }
      } catch (error) {
        console.log(`❌ Error creating bet transaction ${i}:`, error.response?.data || error.message);
      }
      
      // Small delay between bets
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 **CREATED ${betTransactions.length} BET TRANSACTIONS**`);
    
    // Now cancel them quickly
    console.log('\n🔄 **CANCELLING TRANSACTIONS QUICKLY**');
    
    const cancelPromises = betTransactions.map(async (transaction_id, index) => {
      console.log(`\n🔄 **CANCELLING TRANSACTION ${index + 1}: ${transaction_id}`);
      
      const cancelCommand = 'cancel';
      const cancelRequestTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      // Generate cancel request hash
      const cancelRequestHash = crypto.createHash('sha1')
        .update(cancelCommand + cancelRequestTimestamp + SECRET_KEY)
        .digest('hex');
      
      // Generate cancel authorization header
      const cancelAuthHash = crypto.createHash('sha1')
        .update(cancelCommand + SECRET_KEY)
        .digest('hex');
      
      // Create cancel request
      const cancelRequest = {
        command: cancelCommand,
        request_timestamp: cancelRequestTimestamp,
        hash: cancelRequestHash,
        data: {
          transaction_id: transaction_id,
          user_id: "48"
        }
      };

      try {
        const cancelResponse = await axios.post(`${BASE_URL}/api/provider-callback`, cancelRequest, {
          headers: {
            'X-Authorization': cancelAuthHash,
            'X-Operator-Id': OPERATOR_ID,
            'Content-Type': 'application/json'
          }
        });

        if (cancelResponse.data.response?.status === 'OK') {
          console.log(`✅ Cancel ${index + 1} successful`);
          return { success: true, transaction_id, response: cancelResponse.data };
        } else {
          console.log(`❌ Cancel ${index + 1} failed: ${cancelResponse.data.response?.error_message}`);
          return { success: false, transaction_id, error: cancelResponse.data.response?.error_message };
        }
      } catch (error) {
        console.log(`❌ Cancel ${index + 1} error:`, error.response?.data || error.message);
        return { success: false, transaction_id, error: error.message };
      }
    });
    
    // Execute all cancels simultaneously
    const cancelResults = await Promise.all(cancelPromises);
    
    console.log('\n📊 **CANCEL RESULTS**');
    cancelResults.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ Cancel ${index + 1}: SUCCESS`);
      } else {
        console.log(`❌ Cancel ${index + 1}: FAILED - ${result.error}`);
      }
    });
    
    // Check final balance
    console.log('\n💰 **FINAL BALANCE CHECK**');
    
    const finalBalanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (finalBalanceResponse.data.success && finalBalanceResponse.data.data) {
      const data = finalBalanceResponse.data.data;
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      console.log(`Slot Wallet: $${data.slot_balance || 0}`);
      console.log(`Category Balances:`, data.category_balances || {});
    }
    
    // Check all recent transactions for user 48
    console.log('\n🔍 **RECENT TRANSACTIONS FOR USER 48**');
    
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (transactionsResponse.data.success && transactionsResponse.data.data) {
      const transactions = transactionsResponse.data.data;
      const user48Transactions = transactions.filter(t => t.user_id === 48);
      
      // Show recent transactions with balance info
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
      
      // Check for any balance jumps
      const balanceJumps = user48Transactions.filter(t => 
        t.balance_before && 
        t.balance_after && 
        Math.abs(t.balance_after - t.balance_before) > 1.0 // More than $1 change
      );
      
      if (balanceJumps.length > 0) {
        console.log('❌ **BALANCE JUMPS DETECTED!**');
        balanceJumps.forEach((t, index) => {
          console.log(`${index + 1}. Transaction ID: ${t.id}`);
          console.log(`   Type: ${t.type} | Amount: $${t.amount}`);
          console.log(`   Balance Before: $${t.balance_before} | Balance After: $${t.balance_after}`);
          console.log(`   Change: $${Math.abs(t.balance_after - t.balance_before)}`);
          console.log(`   Description: ${t.description || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('✅ **NO BALANCE JUMPS DETECTED**');
      }
    }
    
  } catch (error) {
    console.error('❌ Error in multiple cancels test:', error.response?.data || error.message);
  }
}

// Run the test
testMultipleCancels(); 