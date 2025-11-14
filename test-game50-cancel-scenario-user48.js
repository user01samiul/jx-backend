const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000';
const USER_ID = 48;
const GAME_ID = 50;
const CATEGORY = 'slots';
const USER_TOKEN = 'cecb0fc413ae3f38ad0583965ba90a91'; // Valid token for user 48

// Test data - small amounts to match the scenario
const TEST_AMOUNTS = {
    bet1: 0.01,
    bet2: 0.01
};

// Helper functions
function generateAuthHeader(command) {
    const crypto = require('crypto');
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    return crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
}

function generateHash(request) {
    const crypto = require('crypto');
    const SECRET_KEY = '2xk3SrX09oQ71Z3F';
    return crypto.createHash('sha1')
        .update(request.command + request.request_timestamp + SECRET_KEY)
        .digest('hex');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCancelScenario() {
    console.log('🎮 Starting Cancel Scenario Test for User 48 on Game 50');
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
        
        // Step 2: Place 2 small bets (simulating the existing bets)
        console.log('\n🎯 Step 2: Placing 2 small bets...');
        const betTransactions = [];
        
        for (let i = 1; i <= 2; i++) {
            const betAmount = i === 1 ? TEST_AMOUNTS.bet1 : TEST_AMOUNTS.bet2;
            const transactionId = `test_game50_bet_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const betRequest = {
                command: 'changebalance',
                request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                hash: '',
                data: {
                    token: USER_TOKEN,
                    user_id: USER_ID,
                    game_id: GAME_ID,
                    amount: betAmount,
                    transaction_id: transactionId,
                    type: 'BET'
                }
            };
            betRequest.hash = generateHash(betRequest);
            
            const betResponse = await axios.post(`${BASE_URL}/innova/changebalance`, betRequest, {
                headers: {
                    'X-Authorization': generateAuthHeader('changebalance')
                }
            });
            
            console.log(`✅ Bet ${i}: $${betAmount} - Transaction: ${transactionId}`);
            console.log(`📋 Balance after bet: $${betResponse.data.response.data.balance}`);
            betTransactions.push({
                transactionId,
                amount: betAmount,
                response: betResponse.data
            });
            
            await sleep(1000); // Wait 1 second between bets
        }
        
        // Step 3: Check balance after both bets
        console.log('\n📊 Step 3: Checking balance after both bets...');
        const midBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const midBalance = midBalanceResponse.data.response.data.balance;
        console.log(`✅ Balance after both bets: $${midBalance}`);
        
        // Step 4: Cancel the 1st bet
        console.log('\n🔄 Step 4: Cancelling the 1st bet...');
        const firstBetToCancel = betTransactions[0];
        
        const cancel1Request = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: firstBetToCancel.transactionId,
                type: 'CANCEL'
            }
        };
        cancel1Request.hash = generateHash(cancel1Request);
        
        const cancel1Response = await axios.post(`${BASE_URL}/innova/cancel`, cancel1Request, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled 1st bet: $${firstBetToCancel.amount} - Transaction: ${firstBetToCancel.transactionId}`);
        console.log(`📋 Cancel response:`, cancel1Response.data);
        
        // Step 5: Check balance after 1st cancel
        console.log('\n📊 Step 5: Checking balance after 1st cancel...');
        const balanceAfterCancel1Response = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const balanceAfterCancel1 = balanceAfterCancel1Response.data.response.data.balance;
        console.log(`✅ Balance after 1st cancel: $${balanceAfterCancel1}`);
        
        // Step 6: Cancel the 2nd bet
        console.log('\n🔄 Step 6: Cancelling the 2nd bet...');
        const secondBetToCancel = betTransactions[1];
        
        const cancel2Request = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: secondBetToCancel.transactionId,
                type: 'CANCEL'
            }
        };
        cancel2Request.hash = generateHash(cancel2Request);
        
        const cancel2Response = await axios.post(`${BASE_URL}/innova/cancel`, cancel2Request, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled 2nd bet: $${secondBetToCancel.amount} - Transaction: ${secondBetToCancel.transactionId}`);
        console.log(`📋 Cancel response:`, cancel2Response.data);
        
        // Step 7: Check final balance after 2nd cancel
        console.log('\n📊 Step 7: Checking final balance after 2nd cancel...');
        const finalBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const finalBalance = finalBalanceResponse.data.response.data.balance;
        console.log(`✅ Final balance after 2nd cancel: $${finalBalance}`);
        
        // Step 8: Calculate expected balances
        console.log('\n🧮 Step 8: Calculating expected balances...');
        const expectedBalanceAfterCancel1 = initialBalance + TEST_AMOUNTS.bet1;
        const expectedFinalBalance = initialBalance + TEST_AMOUNTS.bet1 + TEST_AMOUNTS.bet2;
        
        console.log(`📊 Expected balance after 1st cancel: $${expectedBalanceAfterCancel1}`);
        console.log(`📊 Actual balance after 1st cancel: $${balanceAfterCancel1}`);
        console.log(`📊 Difference after 1st cancel: $${(balanceAfterCancel1 - expectedBalanceAfterCancel1).toFixed(2)}`);
        
        console.log(`📊 Expected final balance: $${expectedFinalBalance}`);
        console.log(`📊 Actual final balance: $${finalBalance}`);
        console.log(`📊 Final difference: $${(finalBalance - expectedFinalBalance).toFixed(2)}`);
        
        // Step 9: Check category balance in database
        console.log('\n📊 Step 9: Checking category balance in database...');
        console.log('🔍 Run this command to check category balance:');
        console.log(`docker exec -it pg_db psql -U postgres -d jackpotx-db -c "SELECT user_id, category, balance FROM user_category_balances WHERE user_id = ${USER_ID};"`);
        
        console.log('\n🎉 Cancel scenario test completed!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testCancelScenario(); 