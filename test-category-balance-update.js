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
    bet: 0.05  // Small bet amount
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

async function testCategoryBalanceUpdate() {
    console.log('🔍 Category Balance Update Test');
    console.log('=' .repeat(50));
    console.log('📋 Test Flow:');
    console.log('1. Check initial category balance');
    console.log('2. Place a bet');
    console.log('3. Check category balance after bet');
    console.log('4. Call cancel on the bet');
    console.log('5. Check category balance after cancel');
    console.log('6. Verify the balance was updated correctly');
    console.log('=' .repeat(50));
    
    try {
        // Step 1: Check initial category balance
        console.log('\n📊 Step 1: Checking initial category balance...');
        const { exec } = require('child_process');
        
        const getCategoryBalance = () => {
            return new Promise((resolve, reject) => {
                exec('docker exec pg_db psql -U postgres -d jackpotx-db -c "SELECT balance FROM user_category_balances WHERE user_id = 50 AND category = \'slots\';"', (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(stdout);
                });
            });
        };
        
        let initialDbBalance = await getCategoryBalance();
        console.log('📋 Initial database balance:');
        console.log(initialDbBalance);
        
        // Parse the balance
        const lines = initialDbBalance.trim().split('\n');
        const dataLine = lines[lines.length - 2]; // Second to last line contains the data
        const parts = dataLine.split('|').map(part => part.trim());
        const initialBalance = parseFloat(parts[0]) || 0;
        console.log(`📋 Parsed parts: [${parts.join(', ')}]`);
        console.log(`📋 Raw data line: "${dataLine}"`);
        console.log(`✅ Initial category balance: $${initialBalance}`);
        
        // Step 2: Place a bet
        console.log('\n🎯 Step 2: Placing a bet...');
        const betTransactionId = `test_category_bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
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
        
        // Step 3: Check category balance after bet
        console.log('\n📊 Step 3: Checking category balance after bet...');
        let afterBetDbBalance = await getCategoryBalance();
        console.log('📋 Database balance after bet:');
        console.log(afterBetDbBalance);
        
        const afterBetLines = afterBetDbBalance.trim().split('\n');
        const afterBetDataLine = afterBetLines[afterBetLines.length - 2]; // Second to last line contains the data
        const afterBetParts = afterBetDataLine.split('|').map(part => part.trim());
        const afterBetBalance = parseFloat(afterBetParts[0]) || 0;
        console.log(`📋 After bet parsed parts: [${afterBetParts.join(', ')}]`);
        console.log(`✅ Category balance after bet: $${afterBetBalance}`);
        
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
        
        // Step 5: Check category balance after cancel
        console.log('\n📊 Step 5: Checking category balance after cancel...');
        let afterCancelDbBalance = await getCategoryBalance();
        console.log('📋 Database balance after cancel:');
        console.log(afterCancelDbBalance);
        
        const afterCancelLines = afterCancelDbBalance.trim().split('\n');
        const afterCancelDataLine = afterCancelLines[afterCancelLines.length - 2]; // Second to last line contains the data
        const afterCancelParts = afterCancelDataLine.split('|').map(part => part.trim());
        const afterCancelBalance = parseFloat(afterCancelParts[0]) || 0;
        console.log(`📋 After cancel parsed parts: [${afterCancelParts.join(', ')}]`);
        console.log(`✅ Category balance after cancel: $${afterCancelBalance}`);
        
        const expectedAfterCancelBalance = initialBalance; // Should return to initial balance
        console.log(`📊 Expected balance after cancel: $${expectedAfterCancelBalance}`);
        console.log(`📊 Difference: $${(afterCancelBalance - expectedAfterCancelBalance).toFixed(2)}`);
        
        // Step 6: Verify the balance was updated correctly
        console.log('\n🔍 Step 6: Verifying balance update...');
        const isCorrect = Math.abs(afterCancelBalance - expectedAfterCancelBalance) < 0.01;
        
        if (isCorrect) {
            console.log('✅ SUCCESS: Category balance was updated correctly!');
        } else {
            console.log('❌ FAILURE: Category balance was not updated correctly!');
        }
        
        // Step 7: Summary
        console.log('\n📋 Step 7: Test Summary');
        console.log('=' .repeat(40));
        console.log(`Initial Category Balance: $${initialBalance}`);
        console.log(`After Bet: $${afterBetBalance}`);
        console.log(`After Cancel: $${afterCancelBalance}`);
        console.log(`Expected Final: $${expectedAfterCancelBalance}`);
        console.log(`Balance Update: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
        
        console.log('\n🎉 Category Balance Update Test completed!');
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testCategoryBalanceUpdate(); 