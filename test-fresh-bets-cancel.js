const axios = require('axios');
const crypto = require('crypto');

// Configuration for Player 48
const BASE_URL = 'http://localhost:3000';
const USER_ID = 48;
const GAME_ID = 18; // Slot game
const CATEGORY = 'slots';
const USER_TOKEN = 'cecb0fc413ae3f38ad0583965ba90a91'; // Token for user 48

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

async function getCategoryBalance() {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
        exec('docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT balance FROM user_category_balances WHERE user_id = 48 AND category = \'slots\';"', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

function parseBalance(output) {
    const lines = output.trim().split('\n');
    const dataLine = lines[lines.length - 2]; // Second to last line contains the data
    const parts = dataLine.split('|').map(part => part.trim());
    return parseFloat(parts[0]) || 0;
}

async function testFreshBetsCancel() {
    console.log('🔄 Fresh Bets Cancel Test');
    console.log('=' .repeat(50));
    console.log('📋 Test Flow:');
    console.log('1. Check initial category balance');
    console.log('2. Place 3 fresh bets with wins');
    console.log('3. Cancel each bet and verify net loss calculation');
    console.log('4. Verify final balance is correct');
    console.log('=' .repeat(50));
    
    try {
        // Step 1: Check initial category balance
        console.log('\n📊 Step 1: Checking initial category balance...');
        let initialBalanceOutput = await getCategoryBalance();
        console.log('📋 Initial database balance:');
        console.log(initialBalanceOutput);
        
        const initialBalance = parseBalance(initialBalanceOutput);
        console.log(`✅ Initial category balance: $${initialBalance}`);
        
        // Step 2: Place 3 fresh bets with wins
        console.log('\n🎯 Step 2: Placing 3 fresh bets with wins...');
        
        const bets = [
            { betAmount: 0.20, winAmount: 0.04, roundId: 1350501 }, // Net loss: $0.16
            { betAmount: 0.20, winAmount: 0.12, roundId: 1350502 }, // Net loss: $0.08
            { betAmount: 0.20, winAmount: 0.08, roundId: 1350503 }  // Net loss: $0.12
        ];
        
        const betTransactions = [];
        
        for (let i = 0; i < bets.length; i++) {
            const bet = bets[i];
            const transactionId = `test_fresh_bet_${Date.now()}_${i}`;
            
            // Place bet
            const betRequest = {
                command: 'changebalance',
                request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                hash: '',
                data: {
                    token: USER_TOKEN,
                    user_id: USER_ID,
                    game_id: GAME_ID,
                    amount: bet.betAmount,
                    transaction_id: transactionId,
                    transaction_type: 'BET'
                }
            };
            betRequest.hash = generateHash(betRequest);
            
            const betResponse = await axios.post(`${BASE_URL}/innova/changebalance`, betRequest, {
                headers: {
                    'X-Authorization': generateAuthHeader('changebalance')
                }
            });
            
            console.log(`✅ Bet ${i + 1} placed: $${bet.betAmount} - Transaction: ${transactionId}`);
            console.log(`📋 Balance after bet: $${betResponse.data.response.data.balance}`);
            
            betTransactions.push({
                transactionId,
                betAmount: bet.betAmount,
                winAmount: bet.winAmount,
                roundId: bet.roundId,
                expectedNetLoss: bet.betAmount - bet.winAmount
            });
            
            await sleep(1000);
            
            // Place win
            const winTransactionId = `test_fresh_win_${Date.now()}_${i}`;
            const winRequest = {
                command: 'changebalance',
                request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                hash: '',
                data: {
                    token: USER_TOKEN,
                    user_id: USER_ID,
                    game_id: GAME_ID,
                    amount: bet.winAmount,
                    transaction_id: winTransactionId,
                    transaction_type: 'WIN'
                }
            };
            winRequest.hash = generateHash(winRequest);
            
            const winResponse = await axios.post(`${BASE_URL}/innova/changebalance`, winRequest, {
                headers: {
                    'X-Authorization': generateAuthHeader('changebalance')
                }
            });
            
            console.log(`✅ Win ${i + 1} placed: $${bet.winAmount} - Transaction: ${winTransactionId}`);
            console.log(`📋 Balance after win: $${winResponse.data.response.data.balance}`);
            
            await sleep(1000);
        }
        
        // Check balance after all bets and wins
        let balanceAfterBets = await getCategoryBalance();
        let balanceAfterBetsValue = parseBalance(balanceAfterBets);
        console.log(`\n📊 Balance after all bets and wins: $${balanceAfterBetsValue}`);
        
        // Step 3: Cancel each bet and verify net loss calculation
        console.log('\n🔄 Step 3: Cancelling each bet and verifying net loss calculation...');
        
        let totalRefunded = 0;
        
        for (let i = betTransactions.length - 1; i >= 0; i--) {
            const bet = betTransactions[i];
            console.log(`\n🔄 Cancelling bet ${i + 1} (should return $${bet.expectedNetLoss.toFixed(2)} net loss)...`);
            
            const cancelRequest = {
                command: 'cancel',
                request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                hash: '',
                data: {
                    token: USER_TOKEN,
                    user_id: USER_ID,
                    transaction_id: bet.transactionId,
                    type: 'CANCEL'
                }
            };
            cancelRequest.hash = generateHash(cancelRequest);
            
            const cancelResponse = await axios.post(`${BASE_URL}/innova/cancel`, cancelRequest, {
                headers: {
                    'X-Authorization': generateAuthHeader('cancel')
                }
            });
            
            console.log(`✅ Cancelled bet ${i + 1}: Transaction ${bet.transactionId}`);
            console.log(`📋 Cancel response balance: $${cancelResponse.data.response.data.balance}`);
            
            await sleep(1000);
            
            // Check balance after cancel
            let balanceAfterCancel = await getCategoryBalance();
            const balanceAfterCancelValue = parseBalance(balanceAfterCancel);
            const refunded = balanceAfterCancelValue - balanceAfterBetsValue;
            totalRefunded += refunded;
            
            console.log(`📊 Category balance after cancel ${i + 1}: $${balanceAfterCancelValue} (refunded: $${refunded.toFixed(2)})`);
            console.log(`📊 Expected refund: $${bet.expectedNetLoss.toFixed(2)}`);
            
            balanceAfterBetsValue = balanceAfterCancelValue;
        }
        
        // Step 4: Verify final balance
        console.log('\n📊 Step 4: Checking final balance...');
        let finalBalanceOutput = await getCategoryBalance();
        console.log('📋 Final database balance:');
        console.log(finalBalanceOutput);
        
        const finalBalance = parseBalance(finalBalanceOutput);
        console.log(`✅ Final category balance: $${finalBalance}`);
        
        const expectedTotalRefund = bets.reduce((sum, bet) => sum + (bet.betAmount - bet.winAmount), 0);
        const expectedFinalBalance = initialBalance + expectedTotalRefund;
        
        console.log(`📊 Expected total refund: $${expectedTotalRefund.toFixed(2)}`);
        console.log(`📊 Expected final balance: $${expectedFinalBalance.toFixed(2)}`);
        console.log(`📊 Actual total refunded: $${totalRefunded.toFixed(2)}`);
        console.log(`📊 Difference: $${(finalBalance - expectedFinalBalance).toFixed(2)}`);
        
        // Step 5: Verify everything is OK
        console.log('\n🔍 Step 5: Verifying final result...');
        const isCorrect = Math.abs(finalBalance - expectedFinalBalance) < 0.01;
        
        if (isCorrect) {
            console.log('✅ SUCCESS: All bets cancelled with correct net loss calculations!');
        } else {
            console.log('❌ FAILURE: Balance did not return to expected amount!');
        }
        
        // Step 6: Summary
        console.log('\n📋 Step 6: Test Summary');
        console.log('=' .repeat(40));
        console.log(`Initial Balance: $${initialBalance}`);
        console.log(`Balance After Bets: $${parseBalance(balanceAfterBets)}`);
        console.log(`Final Balance: $${finalBalance}`);
        console.log(`Expected Final: $${expectedFinalBalance.toFixed(2)}`);
        console.log(`Total Refunded: $${totalRefunded.toFixed(2)}`);
        console.log(`Expected Refund: $${expectedTotalRefund.toFixed(2)}`);
        console.log(`Result: ${isCorrect ? '✅ SUCCESS' : '❌ FAILURE'}`);
        
        console.log('\n🎉 Fresh Bets Cancel Test completed!');
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testFreshBetsCancel(); 