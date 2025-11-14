const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Create Bet via ChangeBalance and Test Cancel
async function createBetViaChangeBalance() {
  try {
    console.log('🧪 **CREATE BET VIA CHANGEBALANCE AND TEST CANCEL**');
    console.log('==================================================');
    
    // Step 1: Create a bet transaction for user 48 using changebalance
    console.log('\n🎯 **STEP 1: CREATING BET TRANSACTION VIA CHANGEBALANCE**');
    
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    const OPERATOR_ID = 'thinkcode_stg';
    const command = 'changebalance';
    const request_timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Generate unique transaction ID
    const transaction_id = `test_bet_${Date.now()}`;
    
    // Generate request hash
    const requestHash = crypto.createHash('sha1')
      .update(command + request_timestamp + SECRET_KEY)
      .digest('hex');
    
    // Generate authorization header
    const authHash = crypto.createHash('sha1')
      .update(command + SECRET_KEY)
      .digest('hex');
    
    // Create bet request via changebalance (negative amount = bet)
    const betRequest = {
      command: command,
      request_timestamp: request_timestamp,
      hash: requestHash,
      data: {
        user_id: "48",
        game_id: "1",
        amount: "-0.20", // Negative amount = bet
        session_id: `session_${Date.now()}`,
        transaction_id: transaction_id,
        category: "slots"
      }
    };

    console.log('📤 **CHANGEBALANCE REQUEST (BET)**');
    console.log(JSON.stringify(betRequest, null, 2));
    console.log(`🔐 **AUTHORIZATION**: ${authHash}`);

    try {
      const betResponse = await axios.post(`${BASE_URL}/api/provider-callback`, betRequest, {
        headers: {
          'X-Authorization': authHash,
          'X-Operator-Id': OPERATOR_ID,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ **CHANGEBALANCE RESPONSE (BET)**');
      console.log(JSON.stringify(betResponse.data, null, 2));
      
      if (betResponse.data.response?.status === 'OK') {
        console.log('🎉 **BET OPERATION SUCCESSFUL!**');
        
        // Step 2: Check balance after bet
        console.log('\n💰 **STEP 2: CHECKING BALANCE AFTER BET**');
        
        const balanceAfterBetResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
          }
        });

        if (balanceAfterBetResponse.data.success && balanceAfterBetResponse.data.data) {
          const data = balanceAfterBetResponse.data.data;
          console.log('💰 **BALANCE AFTER BET**');
          console.log(`Main Wallet: $${data.balance || 0}`);
          console.log(`Total Balance: $${data.total_balance || 0}`);
          console.log(`Slot Wallet: $${data.slot_balance || 0}`);
          console.log(`Category Balances:`, data.category_balances || {});
        }
        
        // Step 3: Now test the cancel operation
        console.log('\n🔄 **STEP 3: TESTING CANCEL OPERATION**');
        
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

        console.log('📤 **CANCEL REQUEST**');
        console.log(JSON.stringify(cancelRequest, null, 2));
        console.log(`🔐 **AUTHORIZATION**: ${cancelAuthHash}`);

        try {
          const cancelResponse = await axios.post(`${BASE_URL}/api/provider-callback`, cancelRequest, {
            headers: {
              'X-Authorization': cancelAuthHash,
              'X-Operator-Id': OPERATOR_ID,
              'Content-Type': 'application/json'
            }
          });

          console.log('✅ **CANCEL RESPONSE**');
          console.log(JSON.stringify(cancelResponse.data, null, 2));
          
          if (cancelResponse.data.response?.status === 'OK') {
            console.log('🎉 **CANCEL OPERATION SUCCESSFUL!**');
            
            // Step 4: Check balance after cancel
            console.log('\n💰 **STEP 4: CHECKING BALANCE AFTER CANCEL**');
            
            const balanceAfterCancelResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
              headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
              }
            });

            if (balanceAfterCancelResponse.data.success && balanceAfterCancelResponse.data.data) {
              const data = balanceAfterCancelResponse.data.data;
              console.log('💰 **BALANCE AFTER CANCEL**');
              console.log(`Main Wallet: $${data.balance || 0}`);
              console.log(`Total Balance: $${data.total_balance || 0}`);
              console.log(`Slot Wallet: $${data.slot_balance || 0}`);
              console.log(`Category Balances:`, data.category_balances || {});
            }
            
            // Step 5: Check the transaction details to see the balance jump
            console.log('\n🔍 **STEP 5: CHECKING TRANSACTION DETAILS**');
            
            const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
              headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
              }
            });

            if (transactionsResponse.data.success && transactionsResponse.data.data) {
              const transactions = transactionsResponse.data.data;
              const user48Transactions = transactions.filter(t => t.user_id === 48);
              
              // Find the cancel transaction
              const cancelTransaction = user48Transactions.find(t => 
                t.type === 'adjustment' && 
                t.description && 
                t.description.includes('Cancelled') &&
                t.metadata?.original_transaction === transaction_id
              );

              if (cancelTransaction) {
                console.log('✅ **CANCEL TRANSACTION FOUND**');
                console.log(`   User ID: ${cancelTransaction.user_id}`);
                console.log(`   Amount: $${cancelTransaction.amount}`);
                console.log(`   Description: ${cancelTransaction.description}`);
                console.log(`   Balance Before: $${cancelTransaction.balance_before || 'N/A'}`);
                console.log(`   Balance After: $${cancelTransaction.balance_after || 'N/A'}`);
                console.log(`   Category: ${cancelTransaction.metadata?.category || 'N/A'}`);
                
                // Check if the balance jump occurred
                if (cancelTransaction.balance_before && cancelTransaction.balance_after) {
                  const balanceChange = Math.abs(cancelTransaction.balance_after - cancelTransaction.balance_before);
                  const expectedChange = parseFloat(cancelTransaction.amount);
                  
                  if (balanceChange > expectedChange * 1.1) {
                    console.log('❌ **BALANCE JUMP DETECTED!**');
                    console.log(`Expected change: $${expectedChange}, Actual change: $${balanceChange}`);
                    console.log(`Balance jumped from $${cancelTransaction.balance_before} to $${cancelTransaction.balance_after}`);
                  } else {
                    console.log('✅ **BALANCE CHANGE IS REASONABLE**');
                    console.log(`Expected change: $${expectedChange}, Actual change: $${balanceChange}`);
                  }
                }
              }
            }
            
          } else {
            console.log('❌ **CANCEL OPERATION FAILED**');
            console.log(`Error: ${cancelResponse.data.response?.error_message || 'Unknown error'}`);
          }
          
        } catch (cancelError) {
          console.log('❌ **CANCEL ERROR**');
          console.log('Status:', cancelError.response?.status);
          console.log('Response:', JSON.stringify(cancelError.response?.data, null, 2));
        }
        
      } else {
        console.log('❌ **BET OPERATION FAILED**');
        console.log(`Error: ${betResponse.data.response?.error_message || 'Unknown error'}`);
      }
      
    } catch (betError) {
      console.log('❌ **BET ERROR**');
      console.log('Status:', betError.response?.status);
      console.log('Response:', JSON.stringify(betError.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error in create bet via changebalance and test cancel:', error.response?.data || error.message);
  }
}

// Run the test
createBetViaChangeBalance(); 