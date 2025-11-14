const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000';
const USER_ID = 48;
const GAME_ID = 43;
const CATEGORY = 'slots';
const USER_TOKEN = 'cecb0fc413ae3f38ad0583965ba90a91'; // Valid token for user 48

// Test data
const TEST_AMOUNTS = {
    bet1: 5.00,
    bet2: 8.00,
    bet3: 3.00,
    win1: 12.00,
    win2: 6.00,
    lose: 4.00
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

async function testComplexScenario() {
    console.log('🎮 Starting Complex Scenario Test for User 48 on Game 43 (Provider Callback)');
    console.log('=' .repeat(70));
    
    try {
        // Step 1: Check initial balance using provider callback
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
        
        console.log('📋 Balance response structure:', JSON.stringify(balanceResponse.data, null, 2));
        
        const initialBalance = balanceResponse.data.response.data.balance;
        console.log(`✅ Initial balance: $${initialBalance}`);
        
        // Step 2: Place 3 bets
        console.log('\n🎯 Step 2: Placing 3 bets...');
        const betTransactions = [];
        
        for (let i = 1; i <= 3; i++) {
            const betAmount = i === 1 ? TEST_AMOUNTS.bet1 : i === 2 ? TEST_AMOUNTS.bet2 : TEST_AMOUNTS.bet3;
            const transactionId = `test_game43_bet_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
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
            console.log(`📋 Bet request sent:`, JSON.stringify(betRequest, null, 2));
            console.log(`📋 Bet response received:`, JSON.stringify(betResponse.data, null, 2));
            console.log(`📋 Balance after bet: $${betResponse.data.response?.data?.balance || 'undefined'}`);
            betTransactions.push({
                transactionId,
                amount: betAmount,
                response: betResponse.data
            });
            
            await sleep(1000); // Wait 1 second between bets
        }
        
        // Step 3: Process 2 wins
        console.log('\n🏆 Step 3: Processing 2 wins...');
        const winTransactions = [];
        
        for (let i = 1; i <= 2; i++) {
            const winAmount = i === 1 ? TEST_AMOUNTS.win1 : TEST_AMOUNTS.win2;
            const transactionId = `test_game43_win_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const winRequest = {
                command: 'changebalance',
                request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                hash: '',
                data: {
                    token: USER_TOKEN,
                    user_id: USER_ID,
                    game_id: GAME_ID,
                    amount: winAmount,
                    transaction_id: transactionId,
                    type: 'WIN'
                }
            };
            winRequest.hash = generateHash(winRequest);
            
            const winResponse = await axios.post(`${BASE_URL}/innova/changebalance`, winRequest, {
                headers: {
                    'X-Authorization': generateAuthHeader('changebalance')
                }
            });
            
            console.log(`✅ Win ${i}: $${winAmount} - Transaction: ${transactionId}`);
            console.log(`📋 Balance after win: $${winResponse.data.response.data.balance}`);
            winTransactions.push({
                transactionId,
                amount: winAmount,
                response: winResponse.data
            });
            
            await sleep(1000); // Wait 1 second between wins
        }
        
        // Step 4: Process 1 loss
        console.log('\n💔 Step 4: Processing 1 loss...');
        const loseTransactionId = `test_game43_lose_1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const loseRequest = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: TEST_AMOUNTS.lose,
                transaction_id: loseTransactionId,
                type: 'LOSE'
            }
        };
        loseRequest.hash = generateHash(loseRequest);
        
        const loseResponse = await axios.post(`${BASE_URL}/innova/changebalance`, loseRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('changebalance')
            }
        });
        
        console.log(`✅ Loss: $${TEST_AMOUNTS.lose} - Transaction: ${loseTransactionId}`);
        console.log(`📋 Balance after loss: $${loseResponse.data.response.data.balance}`);
        
        // Step 5: Check balance after all transactions
        console.log('\n📊 Step 5: Checking balance after all transactions...');
        const midBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const midBalance = midBalanceResponse.data.response.data.balance;
        console.log(`✅ Balance after all transactions: $${midBalance}`);
        
        // Step 6: Cancel one of the bet transactions
        console.log('\n🔄 Step 6: Cancelling a bet transaction...');
        const betToCancel = betTransactions[1]; // Cancel the second bet
        
        const cancelRequest = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: betToCancel.transactionId,
                type: 'CANCEL'
            }
        };
        cancelRequest.hash = generateHash(cancelRequest);
        
        const cancelResponse = await axios.post(`${BASE_URL}/innova/cancel`, cancelRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled bet: $${betToCancel.amount} - Transaction: ${betToCancel.transactionId}`);
        console.log(`📋 Cancel response:`, cancelResponse.data);
        
        // Step 7: Check final balance after cancel
        console.log('\n📊 Step 7: Checking final balance after cancel...');
        const finalBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const finalBalance = finalBalanceResponse.data.response.data.balance;
        console.log(`✅ Final balance after cancel: $${finalBalance}`);
        
        // Step 8: Calculate expected balance
        console.log('\n🧮 Step 8: Calculating expected balance...');
        const totalBets = TEST_AMOUNTS.bet1 + TEST_AMOUNTS.bet2 + TEST_AMOUNTS.bet3;
        const totalWins = TEST_AMOUNTS.win1 + TEST_AMOUNTS.win2;
        const totalLosses = TEST_AMOUNTS.lose;
        const cancelledBet = betToCancel.amount;
        
        const expectedBalance = initialBalance - totalBets + totalWins - totalLosses + cancelledBet;
        console.log(`📊 Expected balance: $${expectedBalance}`);
        console.log(`📊 Actual balance: $${finalBalance}`);
        console.log(`📊 Difference: $${(finalBalance - expectedBalance).toFixed(2)}`);
        
        // Step 9: Check category balance in database
        console.log('\n📊 Step 9: Checking category balance in database...');
        console.log('🔍 Run this command to check category balance:');
        console.log(`docker exec -it pg_db psql -U postgres -d jackpotx-db -c "SELECT user_id, category, balance FROM user_category_balances WHERE user_id = ${USER_ID};"`);
        
        console.log('\n🎉 Complex scenario test completed!');
        console.log('=' .repeat(70));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testComplexScenario(); 