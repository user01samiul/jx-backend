const axios = require('axios');
const crypto = require('crypto');

// Configuration for Player 50
const BASE_URL = 'http://localhost:3000';
const USER_ID = 50;
const GAME_ID = 45; // Slot game
const CATEGORY = 'slots';
const USER_TOKEN = 'token_for_user50_test'; // Token for user 50

// Test amounts for the scenario
const TEST_AMOUNTS = {
    bet1: 0.05, // First bet
    bet2: 0.05, // Second bet
    win: 0.10   // Win amount
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

async function testPlayer50SlotCancelScenario() {
    console.log('🎮 Starting Player 50 Slot Cancel Scenario Test');
    console.log('=' .repeat(60));
    console.log(`👤 User ID: ${USER_ID}`);
    console.log(`🎯 Game ID: ${GAME_ID} (Slots)`);
    console.log(`💰 Category: ${CATEGORY}`);
    console.log('=' .repeat(60));
    
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
        
        const balanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const initialBalance = balanceResponse.data.response.data.balance;
        console.log(`✅ Initial balance: $${initialBalance}`);
        
        // Step 2: Place first bet (should lose)
        console.log('\n🎯 Step 2: Placing first bet (expected to lose)...');
        const bet1TransactionId = `test_player50_bet1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const bet1Request = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: TEST_AMOUNTS.bet1,
                transaction_id: bet1TransactionId,
                type: 'BET'
            }
        };
        bet1Request.hash = generateHash(bet1Request);
        
        const bet1Response = await axios.post(`${BASE_URL}/innova/changebalance`, bet1Request, {
            headers: {
                'X-Authorization': generateAuthHeader('changebalance')
            }
        });
        
        console.log(`✅ First bet: $${TEST_AMOUNTS.bet1} - Transaction: ${bet1TransactionId}`);
        console.log(`📋 Balance after first bet: $${bet1Response.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Step 3: Place second bet (should win)
        console.log('\n🎯 Step 3: Placing second bet (expected to win)...');
        const bet2TransactionId = `test_player50_bet2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const bet2Request = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: TEST_AMOUNTS.bet2,
                transaction_id: bet2TransactionId,
                type: 'BET'
            }
        };
        bet2Request.hash = generateHash(bet2Request);
        
        const bet2Response = await axios.post(`${BASE_URL}/innova/changebalance`, bet2Request, {
            headers: {
                'X-Authorization': generateAuthHeader('changebalance')
            }
        });
        
        console.log(`✅ Second bet: $${TEST_AMOUNTS.bet2} - Transaction: ${bet2TransactionId}`);
        console.log(`📋 Balance after second bet: $${bet2Response.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Step 4: Process win for second bet
        console.log('\n🏆 Step 4: Processing win for second bet...');
        const winTransactionId = `test_player50_win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const winRequest = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: TEST_AMOUNTS.win,
                transaction_id: winTransactionId,
                type: 'WIN'
            }
        };
        winRequest.hash = generateHash(winRequest);
        
        const winResponse = await axios.post(`${BASE_URL}/innova/changebalance`, winRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('changebalance')
            }
        });
        
        console.log(`✅ Win: $${TEST_AMOUNTS.win} - Transaction: ${winTransactionId}`);
        console.log(`📋 Balance after win: $${winResponse.data.response.data.balance}`);
        
        // Step 5: Check balance after all transactions
        console.log('\n📊 Step 5: Checking balance after all transactions...');
        const midBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const midBalance = midBalanceResponse.data.response.data.balance;
        console.log(`✅ Balance after all transactions: $${midBalance}`);
        
        // Expected balance calculation
        const expectedBalance = initialBalance - TEST_AMOUNTS.bet1 - TEST_AMOUNTS.bet2 + TEST_AMOUNTS.win;
        console.log(`📊 Expected balance: $${expectedBalance}`);
        console.log(`📊 Actual balance: $${midBalance}`);
        console.log(`📊 Difference: $${(midBalance - expectedBalance).toFixed(2)}`);
        
        // Step 6: Cancel the first bet transaction
        console.log('\n🔄 Step 6: Cancelling the first bet transaction...');
        const cancelRequest = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: bet1TransactionId,
                type: 'CANCEL'
            }
        };
        cancelRequest.hash = generateHash(cancelRequest);
        
        const cancelResponse = await axios.post(`${BASE_URL}/innova/cancel`, cancelRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled bet: $${TEST_AMOUNTS.bet1} - Transaction: ${bet1TransactionId}`);
        console.log(`📋 Cancel response:`, JSON.stringify(cancelResponse.data, null, 2));
        
        // Step 7: Check final balance after cancel
        console.log('\n📊 Step 7: Checking final balance after cancel...');
        const finalBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const finalBalance = finalBalanceResponse.data.response.data.balance;
        console.log(`✅ Final balance after cancel: $${finalBalance}`);
        
        // Step 8: Calculate expected balance after cancel
        console.log('\n🧮 Step 8: Calculating expected balance after cancel...');
        const expectedBalanceAfterCancel = initialBalance - TEST_AMOUNTS.bet2 + TEST_AMOUNTS.win + TEST_AMOUNTS.bet1;
        console.log(`📊 Expected balance after cancel: $${expectedBalanceAfterCancel}`);
        console.log(`📊 Actual balance after cancel: $${finalBalance}`);
        console.log(`📊 Difference: $${(finalBalance - expectedBalanceAfterCancel).toFixed(2)}`);
        
        // Step 9: Check category balance in database
        console.log('\n📊 Step 9: Checking category balance in database...');
        console.log('🔍 Run this command to check category balance:');
        console.log(`docker exec -it pg_db psql -U postgres -d jackpotx-db -c "SELECT user_id, category, balance FROM user_category_balances WHERE user_id = ${USER_ID};"`);
        
        // Step 10: Summary
        console.log('\n📋 Step 10: Test Summary');
        console.log('=' .repeat(40));
        console.log(`Initial Balance: $${initialBalance}`);
        console.log(`After 2 bets + 1 win: $${midBalance}`);
        console.log(`After cancelling first bet: $${finalBalance}`);
        console.log(`Expected final balance: $${expectedBalanceAfterCancel}`);
        console.log(`Balance should return to: $${initialBalance - TEST_AMOUNTS.bet2 + TEST_AMOUNTS.win + TEST_AMOUNTS.bet1}`);
        
        console.log('\n🎉 Player 50 Slot Cancel Scenario Test completed!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testPlayer50SlotCancelScenario(); 