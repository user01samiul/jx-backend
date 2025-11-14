const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000';
const USER_ID = 48;
const GAME_ID = 43;
const CATEGORY = 'slots';

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
function generateAuthHeader(userId) {
    const timestamp = Date.now();
    const data = `${userId}${timestamp}`;
    const hash = crypto.createHmac('sha256', 'your-secret-key').update(data).digest('hex');
    return `${userId}.${timestamp}.${hash}`;
}

function generateHash(data) {
    return crypto.createHmac('sha256', 'your-secret-key').update(JSON.stringify(data)).digest('hex');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testComplexScenario() {
    console.log('🎮 Starting Complex Scenario Test for User 48 on Game 43');
    console.log('=' .repeat(60));
    
    try {
        // Step 1: Check initial balance
        console.log('\n📊 Step 1: Checking initial balance...');
        const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
            headers: {
                'Authorization': `Bearer ${generateAuthHeader(USER_ID)}`,
                'X-Authorization': generateAuthHeader(USER_ID)
            }
        });
        
        const initialBalance = balanceResponse.data.data.balance;
        console.log(`✅ Initial balance: $${initialBalance}`);
        
        // Step 2: Place 3 bets
        console.log('\n🎯 Step 2: Placing 3 bets...');
        const betTransactions = [];
        
        for (let i = 1; i <= 3; i++) {
            const betAmount = i === 1 ? TEST_AMOUNTS.bet1 : i === 2 ? TEST_AMOUNTS.bet2 : TEST_AMOUNTS.bet3;
            const transactionId = `test_game43_bet_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const betData = {
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: betAmount,
                transaction_id: transactionId,
                type: 'BET'
            };
            
            const betResponse = await axios.post(`${BASE_URL}/provider/callback/changebalance`, betData, {
                headers: {
                    'X-Authorization': generateAuthHeader(USER_ID),
                    'X-Hash': generateHash(betData)
                }
            });
            
            console.log(`✅ Bet ${i}: $${betAmount} - Transaction: ${transactionId}`);
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
            
            const winData = {
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: winAmount,
                transaction_id: transactionId,
                type: 'WIN'
            };
            
            const winResponse = await axios.post(`${BASE_URL}/provider/callback/changebalance`, winData, {
                headers: {
                    'X-Authorization': generateAuthHeader(USER_ID),
                    'X-Hash': generateHash(winData)
                }
            });
            
            console.log(`✅ Win ${i}: $${winAmount} - Transaction: ${transactionId}`);
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
        
        const loseData = {
            user_id: USER_ID,
            game_id: GAME_ID,
            amount: TEST_AMOUNTS.lose,
            transaction_id: loseTransactionId,
            type: 'LOSE'
        };
        
        const loseResponse = await axios.post(`${BASE_URL}/provider/callback/changebalance`, loseData, {
            headers: {
                'X-Authorization': generateAuthHeader(USER_ID),
                'X-Hash': generateHash(loseData)
            }
        });
        
        console.log(`✅ Loss: $${TEST_AMOUNTS.lose} - Transaction: ${loseTransactionId}`);
        
        // Step 5: Check balance after all transactions
        console.log('\n📊 Step 5: Checking balance after all transactions...');
        const midBalanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
            headers: {
                'Authorization': `Bearer ${generateAuthHeader(USER_ID)}`,
                'X-Authorization': generateAuthHeader(USER_ID)
            }
        });
        
        const midBalance = midBalanceResponse.data.data.balance;
        console.log(`✅ Balance after all transactions: $${midBalance}`);
        
        // Step 6: Cancel one of the bet transactions
        console.log('\n🔄 Step 6: Cancelling a bet transaction...');
        const betToCancel = betTransactions[1]; // Cancel the second bet
        
        const cancelData = {
            user_id: USER_ID,
            transaction_id: betToCancel.transactionId,
            type: 'CANCEL'
        };
        
        const cancelResponse = await axios.post(`${BASE_URL}/provider/callback/cancel`, cancelData, {
            headers: {
                'X-Authorization': generateAuthHeader(USER_ID),
                'X-Hash': generateHash(cancelData)
            }
        });
        
        console.log(`✅ Cancelled bet: $${betToCancel.amount} - Transaction: ${betToCancel.transactionId}`);
        console.log(`📋 Cancel response:`, cancelResponse.data);
        
        // Step 7: Check final balance after cancel
        console.log('\n📊 Step 7: Checking final balance after cancel...');
        const finalBalanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
            headers: {
                'Authorization': `Bearer ${generateAuthHeader(USER_ID)}`,
                'X-Authorization': generateAuthHeader(USER_ID)
            }
        });
        
        const finalBalance = finalBalanceResponse.data.data.balance;
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
        
        // Step 9: Check category balance specifically
        console.log('\n📊 Step 9: Checking category balance...');
        const categoryBalanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
            headers: {
                'Authorization': `Bearer ${generateAuthHeader(USER_ID)}`,
                'X-Authorization': generateAuthHeader(USER_ID)
            }
        });
        
        console.log(`✅ Category balance response:`, categoryBalanceResponse.data);
        
        console.log('\n🎉 Complex scenario test completed!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testComplexScenario(); 