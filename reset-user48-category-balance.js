const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Reset User 48 Category Balance and Test
async function resetUser48CategoryBalance() {
  try {
    console.log('🔄 **RESETTING USER 48 CATEGORY BALANCE**');
    console.log('==========================================');
    
    // Step 1: Create a transfer transaction to reset the balance to 0
    console.log('\n🎯 **STEP 1: RESETTING CATEGORY BALANCE TO 0**');
    
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    const OPERATOR_ID = 'thinkcode_stg';
    const command = 'changebalance';
    const request_timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Generate unique transaction ID
    const transaction_id = `reset_balance_${Date.now()}`;
    
    // Generate request hash
    const requestHash = crypto.createHash('sha1')
      .update(command + request_timestamp + SECRET_KEY)
      .digest('hex');
    
    // Generate authorization header
    const authHash = crypto.createHash('sha1')
      .update(command + SECRET_KEY)
      .digest('hex');
    
    // Create reset request (negative amount to reduce balance to 0)
    const resetRequest = {
      command: command,
      request_timestamp: request_timestamp,
      hash: requestHash,
      data: {
        user_id: "48",
        game_id: "1",
        amount: "-1500.40", // Reset to 0 (current balance is around 1500.40)
        session_id: `reset_session_${Date.now()}`,
        transaction_id: transaction_id,
        category: "slots"
      }
    };

    console.log('📤 **RESET BALANCE REQUEST**');
    console.log(JSON.stringify(resetRequest, null, 2));
    console.log(`🔐 **AUTHORIZATION**: ${authHash}`);

    try {
      const resetResponse = await axios.post(`${BASE_URL}/api/provider-callback`, resetRequest, {
        headers: {
          'X-Authorization': authHash,
          'X-Operator-Id': OPERATOR_ID,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ **RESET BALANCE RESPONSE**');
      console.log(JSON.stringify(resetResponse.data, null, 2));
      
      if (resetResponse.data.response?.status === 'OK') {
        console.log('🎉 **RESET OPERATION SUCCESSFUL!**');
        
        // Step 2: Check balance after reset
        console.log('\n💰 **STEP 2: CHECKING BALANCE AFTER RESET**');
        
        const balanceAfterResetResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
          }
        });

        if (balanceAfterResetResponse.data.success && balanceAfterResetResponse.data.data) {
          const data = balanceAfterResetResponse.data.data;
          console.log('💰 **BALANCE AFTER RESET**');
          console.log(`Main Wallet: $${data.balance || 0}`);
          console.log(`Total Balance: $${data.total_balance || 0}`);
          console.log(`Slot Wallet: $${data.slot_balance || 0}`);
          console.log(`Category Balances:`, data.category_balances || {});
        }
        
        // Step 3: Create a new bet transaction
        console.log('\n🎯 **STEP 3: CREATING NEW BET TRANSACTION**');
        
        const betTransactionId = `test_bet_after_reset_${Date.now()}`;
        const betRequestTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        
        // Generate bet request hash
        const betRequestHash = crypto.createHash('sha1')
          .update(command + betRequestTimestamp + SECRET_KEY)
          .digest('hex');
        
        // Generate bet authorization header
        const betAuthHash = crypto.createHash('sha1')
          .update(command + SECRET_KEY)
          .digest('hex');
        
        // Create bet request
        const betRequest = {
          command: command,
          request_timestamp: betRequestTimestamp,
          hash: betRequestHash,
          data: {
            user_id: "48",
            game_id: "1",
            amount: "-0.20", // Bet amount
            session_id: `bet_session_${Date.now()}`,
            transaction_id: betTransactionId,
            category: "slots"
          }
        };

        console.log('📤 **BET REQUEST**');
        console.log(JSON.stringify(betRequest, null, 2));
        console.log(`🔐 **AUTHORIZATION**: ${betAuthHash}`);

        try {
          const betResponse = await axios.post(`${BASE_URL}/api/provider-callback`, betRequest, {
            headers: {
              'X-Authorization': betAuthHash,
              'X-Operator-Id': OPERATOR_ID,
              'Content-Type': 'application/json'
            }
          });

          console.log('✅ **BET RESPONSE**');
          console.log(JSON.stringify(betResponse.data, null, 2));
          
          if (betResponse.data.response?.status === 'OK') {
            console.log('🎉 **BET OPERATION SUCCESSFUL!**');
            
            // Step 4: Check balance after bet
            console.log('\n💰 **STEP 4: CHECKING BALANCE AFTER BET**');
            
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
            
            // Step 5: Now test the cancel operation
            console.log('\n🔄 **STEP 5: TESTING CANCEL OPERATION**');
            
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
                transaction_id: betTransactionId,
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
                
                // Step 7: Check transaction details
                console.log('\n🔍 **STEP 7: CHECKING TRANSACTION DETAILS**');
                
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
                    t.metadata?.original_transaction === betTransactionId
                  );

                  if (cancelTransaction) {
                    console.log('✅ **CANCEL TRANSACTION FOUND**');
                    console.log(`   User ID: ${cancelTransaction.user_id}`);
                    console.log(`   Amount: $${cancelTransaction.amount}`);
                    console.log(`   Description: ${cancelTransaction.description}`);
                    console.log(`   Balance Before: $${cancelTransaction.balance_before || 'N/A'}`);
                    console.log(`   Balance After: $${cancelTransaction.balance_after || 'N/A'}`);
                    console.log(`   Category: ${cancelTransaction.metadata?.category || 'N/A'}`);
                    
                    // Check if the balance is now correct
                    if (cancelTransaction.balance_before && cancelTransaction.balance_after) {
                      const balanceChange = Math.abs(cancelTransaction.balance_after - cancelTransaction.balance_before);
                      const expectedChange = parseFloat(cancelTransaction.amount);
                      
                      if (balanceChange <= expectedChange * 1.1) {
                        console.log('🎯 **SUCCESS: Balance change is now correct!**');
                        console.log(`Expected change: $${expectedChange}, Actual change: $${balanceChange}`);
                      } else {
                        console.log('❌ **FAILED: Balance change is still wrong!**');
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
        
      } else {
        console.log('❌ **RESET OPERATION FAILED**');
        console.log(`Error: ${resetResponse.data.response?.error_message || 'Unknown error'}`);
      }
      
    } catch (resetError) {
      console.log('❌ **RESET ERROR**');
      console.log('Status:', resetError.response?.status);
      console.log('Response:', JSON.stringify(resetError.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error in reset user 48 category balance:', error.response?.data || error.message);
  }
}

// Run the test
resetUser48CategoryBalance(); 