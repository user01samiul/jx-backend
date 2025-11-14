const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Provider Cancel Test Script for User 48
async function testProviderCancelUser48() {
  try {
    console.log('🧪 **PROVIDER CANCEL TEST FOR USER 48**');
    console.log('========================================');
    
    // Step 1: Find a transaction for user 48 to cancel
    console.log('\n🔍 **STEP 1: FINDING USER 48 TRANSACTION**');
    
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
    
    // Find a bet transaction for user 48 that can be cancelled
    const user48Bet = transactions.find(t => 
      t.user_id === 48 && 
      t.type === 'bet' && 
      t.status !== 'cancelled' && 
      t.external_reference && 
      t.metadata?.category === 'slots'
    );

    if (!user48Bet) {
      console.log('❌ No suitable bet transaction found for user 48');
      
      // Show available transactions for user 48
      const user48Transactions = transactions.filter(t => t.user_id === 48);
      console.log('\n📋 **USER 48 TRANSACTIONS**');
      user48Transactions.slice(0, 5).forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
        console.log(`   Status: ${t.status} | External Ref: ${t.external_reference || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log('');
      });
      return;
    }

    console.log(`✅ Found transaction to cancel: ${user48Bet.external_reference}`);
    console.log(`   User ID: ${user48Bet.user_id}`);
    console.log(`   Amount: $${user48Bet.amount}`);
    console.log(`   Type: ${user48Bet.type}`);
    console.log(`   Status: ${user48Bet.status}`);
    console.log(`   Category: ${user48Bet.metadata?.category}`);

    // Step 2: Check current balance before cancel
    console.log('\n💰 **STEP 2: CHECKING CURRENT BALANCE**');
    
    const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (balanceResponse.data.success && balanceResponse.data.data) {
      const data = balanceResponse.data.data;
      console.log('💰 **CURRENT BALANCE BEFORE CANCEL**');
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      console.log(`Slot Wallet: $${data.slot_balance || 0}`);
      console.log(`Category Balances:`, data.category_balances || {});
    }

    // Step 3: Create provider cancel request
    console.log('\n🔄 **STEP 3: CREATING PROVIDER CANCEL REQUEST**');
    
    // Use the correct secret key
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    
    const OPERATOR_ID = 'thinkcode_stg';
    const command = 'cancel';
    const request_timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    console.log(`🏢 Operator ID: ${OPERATOR_ID}`);
    console.log(`📅 Request Timestamp: ${request_timestamp}`);
    console.log(`🆔 Transaction ID: ${user48Bet.external_reference}`);
    console.log(`👤 User ID: ${user48Bet.user_id}`);

    console.log(`🔑 **USING SECRET KEY**: ${SECRET_KEY}`);
    
    // Generate request hash
    const requestHash = crypto.createHash('sha1')
      .update(command + request_timestamp + SECRET_KEY)
      .digest('hex');
    
    // Generate authorization header
    const authHash = crypto.createHash('sha1')
      .update(command + SECRET_KEY)
      .digest('hex');
    
    // TEST 1: Provider sends WRONG user_id (simulating buggy provider)
    console.log('\n🔄 **TEST 1: PROVIDER SENDS WRONG USER_ID**');
    const providerCancelRequestWrong = {
      command: command,
      request_timestamp: request_timestamp,
      hash: requestHash,
      data: {
        transaction_id: user48Bet.external_reference,
        user_id: "1" // Provider sends wrong user_id (admin) instead of 48
      }
    };

    console.log('📤 **PROVIDER CANCEL REQUEST (WRONG USER_ID)**');
    console.log(JSON.stringify(providerCancelRequestWrong, null, 2));
    console.log(`🔐 **AUTHORIZATION**: ${authHash}`);

    try {
      const cancelResponseWrong = await axios.post(`${BASE_URL}/api/provider-callback`, providerCancelRequestWrong, {
        headers: {
          'X-Authorization': authHash,
          'X-Operator-Id': OPERATOR_ID,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ **PROVIDER CANCEL RESPONSE (WRONG USER_ID)**');
      console.log(JSON.stringify(cancelResponseWrong.data, null, 2));
      
      // Check if cancel was successful
      if (cancelResponseWrong.data.response?.status === 'OK') {
        console.log('🎉 **CANCEL OPERATION SUCCESSFUL (WRONG USER_ID)!**');
        console.log('✅ **FIX WORKING: System ignored wrong user_id and used correct user_id from transaction!**');
        
        // Step 4: Check balance after successful cancel
        console.log('\n💰 **STEP 4: CHECKING BALANCE AFTER CANCEL**');
        
        const finalBalanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
          }
        });

        if (finalBalanceResponse.data.success && finalBalanceResponse.data.data) {
          const data = finalBalanceResponse.data.data;
          console.log('💰 **BALANCE AFTER CANCEL**');
          console.log(`Main Wallet: $${data.balance || 0}`);
          console.log(`Total Balance: $${data.total_balance || 0}`);
          console.log(`Slot Wallet: $${data.slot_balance || 0}`);
          console.log(`Category Balances:`, data.category_balances || {});
        }
        
        // Step 5: Verify the fix worked
        console.log('\n🔍 **STEP 5: VERIFYING THE FIX**');
        
        // Check recent transactions to see if the cancel went to the correct user
        const recentTransactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
          }
        });

        if (recentTransactionsResponse.data.success && recentTransactionsResponse.data.data) {
          const recentTransactions = recentTransactionsResponse.data.data;
          const recentCancel = recentTransactions.find(t => 
            t.type === 'adjustment' && 
            t.description && 
            t.description.includes('Cancelled') &&
            t.metadata?.original_transaction === user48Bet.external_reference
          );

          if (recentCancel) {
            console.log('✅ **CANCEL TRANSACTION FOUND**');
            console.log(`   User ID: ${recentCancel.user_id}`);
            console.log(`   Username: ${recentCancel.username}`);
            console.log(`   Amount: $${recentCancel.amount}`);
            console.log(`   Description: ${recentCancel.description}`);
            
            if (recentCancel.user_id === 48) {
              console.log('🎯 **FIX WORKING: Cancel went to correct user (48)!**');
            } else {
              console.log('❌ **FIX FAILED: Cancel went to wrong user!**');
            }
          }
        }
        
        // Since transaction is already cancelled, skip the second test
        console.log('\n⚠️ **SKIPPING TEST 2: Transaction already cancelled**');
        return;
        
      } else {
        console.log('❌ **CANCEL OPERATION FAILED (WRONG USER_ID)**');
        console.log(`Error: ${cancelResponseWrong.data.response?.error_message || 'Unknown error'}`);
      }
      
    } catch (cancelError) {
      console.log('❌ **CANCEL ERROR (WRONG USER_ID)**');
      console.log('Status:', cancelError.response?.status);
      console.log('Response:', JSON.stringify(cancelError.response?.data, null, 2));
    }

    // TEST 2: Provider sends CORRECT user_id (normal behavior)
    console.log('\n🔄 **TEST 2: PROVIDER SENDS CORRECT USER_ID**');
    
    // Generate new timestamp and hashes for second test
    const request_timestamp2 = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const requestHash2 = crypto.createHash('sha1')
      .update(command + request_timestamp2 + SECRET_KEY)
      .digest('hex');
    
    const providerCancelRequestCorrect = {
      command: command,
      request_timestamp: request_timestamp2,
      hash: requestHash2,
      data: {
        transaction_id: user48Bet.external_reference,
        user_id: "48" // Provider sends correct user_id
      }
    };

    console.log('📤 **PROVIDER CANCEL REQUEST (CORRECT USER_ID)**');
    console.log(JSON.stringify(providerCancelRequestCorrect, null, 2));
    console.log(`🔐 **AUTHORIZATION**: ${authHash}`);

    try {
      const cancelResponseCorrect = await axios.post(`${BASE_URL}/api/provider-callback`, providerCancelRequestCorrect, {
        headers: {
          'X-Authorization': authHash,
          'X-Operator-Id': OPERATOR_ID,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ **PROVIDER CANCEL RESPONSE (CORRECT USER_ID)**');
      console.log(JSON.stringify(cancelResponseCorrect.data, null, 2));
      
      // Check if cancel was successful
      if (cancelResponseCorrect.data.response?.status === 'OK') {
        console.log('🎉 **CANCEL OPERATION SUCCESSFUL (CORRECT USER_ID)!**');
        console.log('✅ **NORMAL BEHAVIOR: System used correct user_id from request!**');
      } else {
        console.log('❌ **CANCEL OPERATION FAILED (CORRECT USER_ID)**');
        console.log(`Error: ${cancelResponseCorrect.data.response?.error_message || 'Unknown error'}`);
      }
      
    } catch (cancelError) {
      console.log('❌ **CANCEL ERROR (CORRECT USER_ID)**');
      console.log('Status:', cancelError.response?.status);
      console.log('Response:', JSON.stringify(cancelError.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error in provider cancel test:', error.response?.data || error.message);
  }
}

// Run the test
testProviderCancelUser48(); 