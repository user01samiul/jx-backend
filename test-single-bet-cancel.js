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

async function testSingleBetCancel() {
    console.log('🔄 Single Bet Cancel Test');
    console.log('=' .repeat(50));
    console.log('📋 Test Flow:');
    console.log('1. Check initial category balance');
    console.log('2. Place a single bet ($0.20)');
    console.log('3. Place a win ($0.04)');
    console.log('4. Cancel the bet and verify net loss calculation ($0.16)');
    console.log('5. Verify final balance');
    console.log('=' .repeat(50));
    
    try {
        // Step 1: Check initial category balance
        console.log('\n📊 Step 1: Checking initial category balance...');
        let initialBalanceOutput = await getCategoryBalance();
        console.log('📋 Initial database balance:');
        console.log(initialBalanceOutput);
        
        const initialBalance = parseBalance(initialBalanceOutput);
        console.log(`✅ Initial category balance: $${initialBalance}`);
        
        // Step 2: Place a single bet
        console.log('\n🎯 Step 2: Placing a single bet...');
        const betTransactionId = `test_single_bet_${Date.now()}`;
        
        const betRequest = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: 0.20,
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
        
        console.log(`✅ Bet placed: $0.20 - Transaction: ${betTransactionId}`);
        console.log(`📋 Balance after bet: $${betResponse.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Step 3: Place a win
        console.log('\n🎯 Step 3: Placing a win...');
        const winTransactionId = `test_single_win_${Date.now()}`;
        
        const winRequest = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                amount: 0.04,
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
        
        console.log(`✅ Win placed: $0.04 - Transaction: ${winTransactionId}`);
        console.log(`📋 Balance after win: $${winResponse.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Check balance after bet and win
        let balanceAfterBet = await getCategoryBalance();
        const balanceAfterBetValue = parseBalance(balanceAfterBet);
        console.log(`\n📊 Balance after bet and win: $${balanceAfterBetValue}`);
        
        // Step 4: Cancel the bet
        console.log('\n🔄 Step 4: Cancelling the bet (should return $0.16 net loss)...');
        
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
        
        console.log(`✅ Cancelled bet: Transaction ${betTransactionId}`);
        console.log(`📋 Cancel response balance: $${cancelResponse.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Step 5: Check final balance
        console.log('\n📊 Step 5: Checking final balance...');
        let finalBalanceOutput = await getCategoryBalance();
        console.log('📋 Final database balance:');
        console.log(finalBalanceOutput);
        
        const finalBalance = parseBalance(finalBalanceOutput);
        console.log(`✅ Final category balance: $${finalBalance}`);
        
        const expectedNetLoss = 0.16; // $0.20 bet - $0.04 win
        const expectedFinalBalance = balanceAfterBetValue + expectedNetLoss;
        
        console.log(`📊 Expected net loss refund: $${expectedNetLoss.toFixed(2)}`);
        console.log(`📊 Expected final balance: $${expectedFinalBalance.toFixed(2)}`);
        console.log(`📊 Difference: $${(finalBalance - expectedFinalBalance).toFixed(2)}`);
        
        // Step 6: Verify everything is OK
        console.log('\n🔍 Step 6: Verifying final result...');
        const isCorrect = Math.abs(finalBalance - expectedFinalBalance) < 0.01;
        
        if (isCorrect) {
            console.log('✅ SUCCESS: Bet cancelled with correct net loss calculation!');
        } else {
            console.log('❌ FAILURE: Balance did not return to expected amount!');
        }
        
        // Step 7: Summary
        console.log('\n📋 Step 7: Test Summary');
        console.log('=' .repeat(40));
        console.log(`Initial Balance: $${initialBalance}`);
        console.log(`Balance After Bet: $${parseBalance(balanceAfterBet)}`);
        console.log(`Final Balance: $${finalBalance}`);
        console.log(`Expected Final: $${expectedFinalBalance.toFixed(2)}`);
        console.log(`Result: ${isCorrect ? '✅ SUCCESS' : '❌ FAILURE'}`);
        
        console.log('\n🎉 Single Bet Cancel Test completed!');
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testSingleBetCancel(); 