const axios = require('axios');
const crypto = require('crypto');

// Configuration for Player 50
const BASE_URL = 'http://localhost:3000';
const USER_ID = 50;
const GAME_ID = 45; // Slot game
const CATEGORY = 'slots';
const USER_TOKEN = 'token_for_user50_test';

// Test amounts
const TEST_AMOUNTS = {
    bet: 0.10  // Bet amount
};

// Helper functions
function generateAuthHeader(command) {
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    return crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
}

function generateHash(request) {
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    return crypto.createHash('sha1')
        .update(request.command + request.request_timestamp + SECRET_KEY)
        .digest('hex');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBalanceConsistency() {
    console.log('🔍 Balance Consistency Check');
    console.log('=' .repeat(50));
    console.log('📋 Test Flow:');
    console.log('1. Check initial balance');
    console.log('2. Place a bet');
    console.log('3. Check balance after bet');
    console.log('4. Call cancel on the bet');
    console.log('5. Check final balance');
    console.log('6. Verify category balance consistency');
    console.log('=' .repeat(50));
    
    try {
        // Step 1: Check initial balance
        console.log('\n📊 Step 1: Checking initial balance...');
        const balanceRequest = {
            command: 'balance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                game_id: GAME_ID
            }
        };
        balanceRequest.hash = generateHash(balanceRequest);
        
        const initialBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const initialBalance = initialBalanceResponse.data.response.data.balance;
        console.log(`✅ Initial balance: $${initialBalance}`);
        
        // Step 2: Place a bet
        console.log('\n🎯 Step 2: Placing a bet...');
        const betTransactionId = `test_consistency_bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const betRequest = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: TEST_AMOUNTS.bet,
                transaction_id: betTransactionId,
                transaction_type: 'BET'
            }
        };
        betRequest.hash = generateHash(betRequest);
        
        const betResponse = await axios.post(`${BASE_URL}/innova/changebalance`, betRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('changebalance')
            }
        });
        
        console.log(`✅ Bet placed: $${TEST_AMOUNTS.bet} - Transaction: ${betTransactionId}`);
        console.log(`📋 Balance after bet: $${betResponse.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Step 3: Check balance after bet
        console.log('\n📊 Step 3: Checking balance after bet...');
        const afterBetBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const afterBetBalance = afterBetBalanceResponse.data.response.data.balance;
        console.log(`✅ Balance after bet: $${afterBetBalance}`);
        
        const expectedAfterBetBalance = initialBalance - TEST_AMOUNTS.bet;
        console.log(`📊 Expected balance after bet: $${expectedAfterBetBalance}`);
        console.log(`📊 Difference: $${(afterBetBalance - expectedAfterBetBalance).toFixed(2)}`);
        
        // Step 4: Call cancel on the bet
        console.log('\n🔄 Step 4: Calling cancel on the bet...');
        const cancelRequest = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: betTransactionId,
                type: 'CANCEL'
            }
        };
        cancelRequest.hash = generateHash(cancelRequest);
        
        const cancelResponse = await axios.post(`${BASE_URL}/innova/cancel`, cancelRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled bet: $${TEST_AMOUNTS.bet} - Transaction: ${betTransactionId}`);
        console.log(`📋 Cancel response balance: $${cancelResponse.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Step 5: Check final balance
        console.log('\n📊 Step 5: Checking final balance...');
        const finalBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const finalBalance = finalBalanceResponse.data.response.data.balance;
        console.log(`✅ Final balance: $${finalBalance}`);
        
        const expectedFinalBalance = initialBalance; // Should return to initial balance
        console.log(`📊 Expected final balance: $${expectedFinalBalance}`);
        console.log(`📊 Difference: $${(finalBalance - expectedFinalBalance).toFixed(2)}`);
        
        // Step 6: Verify category balance consistency
        console.log('\n🔍 Step 6: Verifying category balance consistency...');
        console.log('🔍 Checking database category balance...');
        
        // Run the database check command
        const { exec } = require('child_process');
        const checkDbBalance = () => {
            return new Promise((resolve, reject) => {
                exec('docker exec -it pg_db psql -U postgres -d jackpotx-db -c "SELECT user_id, category, balance FROM user_category_balances WHERE user_id = 50;"', (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(stdout);
                });
            });
        };
        
        try {
            const dbResult = await checkDbBalance();
            console.log('📋 Database result:');
            console.log(dbResult);
            
            // Parse the database result to extract the balance
            const lines = dbResult.trim().split('\n');
            const dataLine = lines[lines.length - 1]; // Last line contains the data
            const parts = dataLine.split('|').map(part => part.trim());
            
            if (parts.length >= 3) {
                const dbBalance = parseFloat(parts[2]);
                console.log(`📊 Database category balance: $${dbBalance}`);
                console.log(`📊 API final balance: $${finalBalance}`);
                console.log(`📊 Balance consistency: ${Math.abs(dbBalance - finalBalance) < 0.01 ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
                console.log(`📊 Difference: $${(dbBalance - finalBalance).toFixed(2)}`);
            }
        } catch (error) {
            console.log('⚠️ Could not check database balance directly, but API balance is available');
        }
        
        // Step 7: Summary
        console.log('\n📋 Step 7: Test Summary');
        console.log('=' .repeat(40));
        console.log(`Initial Balance: $${initialBalance}`);
        console.log(`After Bet: $${afterBetBalance}`);
        console.log(`After Cancel: $${finalBalance}`);
        console.log(`Expected Final: $${expectedFinalBalance}`);
        
        const isConsistent = Math.abs(finalBalance - expectedFinalBalance) < 0.01;
        if (isConsistent) {
            console.log('✅ SUCCESS: Balance consistency maintained!');
        } else {
            console.log('❌ FAILURE: Balance inconsistency detected!');
        }
        
        console.log('\n🎉 Balance Consistency Check completed!');
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
checkBalanceConsistency(); 