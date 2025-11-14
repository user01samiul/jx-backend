const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Provider Cancel Test Script - Both Scenarios
async function testProviderCancelBothScenarios() {
  try {
    console.log('🧪 **PROVIDER CANCEL TEST - BOTH SCENARIOS**');
    console.log('============================================');
    
    // Step 1: Find TWO transactions for user 48 to cancel
    console.log('\n🔍 **STEP 1: FINDING USER 48 TRANSACTIONS**');
    
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
    
    // Find bet transactions for user 48 that can be cancelled
    const user48Bets = transactions.filter(t => 
      t.user_id === 48 && 
      t.type === 'bet' && 
      t.status !== 'cancelled' && 
      t.external_reference && 
      t.metadata?.category === 'slots'
    );

    if (user48Bets.length < 2) {
      console.log('❌ Need at least 2 bet transactions for user 48 to test both scenarios');
      console.log(`Found: ${user48Bets.length} transactions`);
      
      // Show available transactions for user 48
      const user48Transactions = transactions.filter(t => t.user_id === 48);
      console.log('\n📋 **USER 48 TRANSACTIONS**');
      user48Transactions.slice(0, 10).forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
        console.log(`   Status: ${t.status} | External Ref: ${t.external_reference || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log('');
      });
      return;
    }

    const transaction1 = user48Bets[0]; // For wrong user_id test
    const transaction2 = user48Bets[1]; // For correct user_id test

    console.log(`✅ Found transaction 1 for wrong user_id test: ${transaction1.external_reference}`);
    console.log(`✅ Found transaction 2 for correct user_id test: ${transaction2.external_reference}`);

    // Step 2: Check current balance before tests
    console.log('\n💰 **STEP 2: CHECKING CURRENT BALANCE**');
    
    const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (balanceResponse.data.success && balanceResponse.data.data) {
      const data = balanceResponse.data.data;
      console.log('💰 **CURRENT BALANCE BEFORE TESTS**');
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      console.log(`Slot Wallet: $${data.slot_balance || 0}`);
      console.log(`Category Balances:`, data.category_balances || {});
    }

    // Configuration
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    const OPERATOR_ID = 'thinkcode_stg';
    const command = 'cancel';

    // TEST 1: Provider sends WRONG user_id (simulating buggy provider)
    console.log('\n🔄 **TEST 1: PROVIDER SENDS WRONG USER_ID**');
    console.log('===========================================');
    
    const request_timestamp1 = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const requestHash1 = crypto.createHash('sha1')
      .update(command + request_timestamp1 + SECRET_KEY)
      .digest('hex');
    
    const authHash1 = crypto.createHash('sha1')
      .update(command + SECRET_KEY)
      .digest('hex');
    
    const providerCancelRequestWrong = {
      command: command,
      request_timestamp: request_timestamp1,
      hash: requestHash1,
      data: {
        transaction_id: transaction1.external_reference,
        user_id: "1" // Provider sends wrong user_id (admin) instead of 48
      }
    };

    console.log('📤 **PROVIDER CANCEL REQUEST (WRONG USER_ID)**');
    console.log(JSON.stringify(providerCancelRequestWrong, null, 2));
    console.log(`🔐 **AUTHORIZATION**: ${authHash1}`);

    try {
      const cancelResponseWrong = await axios.post(`${BASE_URL}/api/provider-callback`, providerCancelRequestWrong, {
        headers: {
          'X-Authorization': authHash1,
          'X-Operator-Id': OPERATOR_ID,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ **PROVIDER CANCEL RESPONSE (WRONG USER_ID)**');
      console.log(JSON.stringify(cancelResponseWrong.data, null, 2));
      
      if (cancelResponseWrong.data.response?.status === 'OK') {
        console.log('🎉 **CANCEL OPERATION SUCCESSFUL (WRONG USER_ID)!**');
        console.log('✅ **FIX WORKING: System ignored wrong user_id and used correct user_id from transaction!**');
        
        // Verify the response shows correct user_id
        const responseUserId = cancelResponseWrong.data.response?.data?.user_id;
        if (responseUserId === "48") {
          console.log('🎯 **CONFIRMED: Response shows correct user_id (48)!**');
        } else {
          console.log('❌ **ISSUE: Response shows wrong user_id!**');
        }
      } else {
        console.log('❌ **CANCEL OPERATION FAILED (WRONG USER_ID)**');
        console.log(`Error: ${cancelResponseWrong.data.response?.error_message || 'Unknown error'}`);
      }
      
    } catch (cancelError) {
      console.log('❌ **CANCEL ERROR (WRONG USER_ID)**');
      console.log('Status:', cancelError.response?.status);
      console.log('Response:', JSON.stringify(cancelError.response?.data, null, 2));
    }

    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TEST 2: Provider sends CORRECT user_id (normal behavior)
    console.log('\n🔄 **TEST 2: PROVIDER SENDS CORRECT USER_ID**');
    console.log('=============================================');
    
    const request_timestamp2 = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const requestHash2 = crypto.createHash('sha1')
      .update(command + request_timestamp2 + SECRET_KEY)
      .digest('hex');
    
    const authHash2 = crypto.createHash('sha1')
      .update(command + SECRET_KEY)
      .digest('hex');
    
    const providerCancelRequestCorrect = {
      command: command,
      request_timestamp: request_timestamp2,
      hash: requestHash2,
      data: {
        transaction_id: transaction2.external_reference,
        user_id: "48" // Provider sends correct user_id
      }
    };

    console.log('📤 **PROVIDER CANCEL REQUEST (CORRECT USER_ID)**');
    console.log(JSON.stringify(providerCancelRequestCorrect, null, 2));
    console.log(`🔐 **AUTHORIZATION**: ${authHash2}`);

    try {
      const cancelResponseCorrect = await axios.post(`${BASE_URL}/api/provider-callback`, providerCancelRequestCorrect, {
        headers: {
          'X-Authorization': authHash2,
          'X-Operator-Id': OPERATOR_ID,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ **PROVIDER CANCEL RESPONSE (CORRECT USER_ID)**');
      console.log(JSON.stringify(cancelResponseCorrect.data, null, 2));
      
      if (cancelResponseCorrect.data.response?.status === 'OK') {
        console.log('🎉 **CANCEL OPERATION SUCCESSFUL (CORRECT USER_ID)!**');
        console.log('✅ **NORMAL BEHAVIOR: System used correct user_id from request!**');
        
        // Verify the response shows correct user_id
        const responseUserId = cancelResponseCorrect.data.response?.data?.user_id;
        if (responseUserId === "48") {
          console.log('🎯 **CONFIRMED: Response shows correct user_id (48)!**');
        } else {
          console.log('❌ **ISSUE: Response shows wrong user_id!**');
        }
      } else {
        console.log('❌ **CANCEL OPERATION FAILED (CORRECT USER_ID)**');
        console.log(`Error: ${cancelResponseCorrect.data.response?.error_message || 'Unknown error'}`);
      }
      
    } catch (cancelError) {
      console.log('❌ **CANCEL ERROR (CORRECT USER_ID)**');
      console.log('Status:', cancelError.response?.status);
      console.log('Response:', JSON.stringify(cancelError.response?.data, null, 2));
    }

    // Step 3: Final balance check
    console.log('\n💰 **STEP 3: FINAL BALANCE CHECK**');
    
    const finalBalanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (finalBalanceResponse.data.success && finalBalanceResponse.data.data) {
      const data = finalBalanceResponse.data.data;
      console.log('💰 **FINAL BALANCE AFTER BOTH TESTS**');
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      console.log(`Slot Wallet: $${data.slot_balance || 0}`);
      console.log(`Category Balances:`, data.category_balances || {});
    }
    
  } catch (error) {
    console.error('❌ Error in provider cancel test:', error.response?.data || error.message);
  }
}

// Run the test
testProviderCancelBothScenarios(); 