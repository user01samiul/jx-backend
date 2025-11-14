const axios = require('axios');
const crypto = require('crypto');

// Configuration for Player 48 (since the transactions are for user 48)
const BASE_URL = 'http://localhost:3000';
const USER_ID = 48;
const GAME_ID = 18; // Slot game
const CATEGORY = 'slots';
const USER_TOKEN = 'cecb0fc413ae3f38ad0583965ba90a91'; // Token for user 48

// Transaction IDs to cancel (in reverse order - most recent first)
const TRANSACTIONS_TO_CANCEL = [
    '2236510', // Third bet (most recent)
    '2236501', // Second bet
    '2236492'  // First bet
];

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

async function testCancelAllBets() {
    console.log('🔄 Cancel All Bets Test');
    console.log('=' .repeat(50));
    console.log('📋 Test Flow:');
    console.log('1. Check initial category balance');
    console.log('2. Cancel bet 3 (most recent)');
    console.log('3. Cancel bet 2');
    console.log('4. Cancel bet 1');
    console.log('5. Verify final balance is $50.00');
    console.log('=' .repeat(50));
    
    try {
        // Step 1: Check initial category balance
        console.log('\n📊 Step 1: Checking initial category balance...');
        let initialBalanceOutput = await getCategoryBalance();
        console.log('📋 Initial database balance:');
        console.log(initialBalanceOutput);
        
        const initialBalance = parseBalance(initialBalanceOutput);
        console.log(`✅ Initial category balance: $${initialBalance}`);
        
        let currentBalance = initialBalance;
        
        // Step 2: Cancel bet 3 (most recent)
        console.log('\n🔄 Step 2: Cancelling bet 3 (most recent)...');
        const cancelRequest3 = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: TRANSACTIONS_TO_CANCEL[0],
                type: 'CANCEL'
            }
        };
        cancelRequest3.hash = generateHash(cancelRequest3);
        
        const cancelResponse3 = await axios.post(`${BASE_URL}/innova/cancel`, cancelRequest3, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled bet 3: Transaction ${TRANSACTIONS_TO_CANCEL[0]}`);
        console.log(`📋 Cancel response balance: $${cancelResponse3.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Check balance after cancel 3
        let balanceAfter3 = await getCategoryBalance();
        currentBalance = parseBalance(balanceAfter3);
        console.log(`📊 Category balance after cancel 3: $${currentBalance}`);
        
        // Step 3: Cancel bet 2
        console.log('\n🔄 Step 3: Cancelling bet 2...');
        const cancelRequest2 = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: TRANSACTIONS_TO_CANCEL[1],
                type: 'CANCEL'
            }
        };
        cancelRequest2.hash = generateHash(cancelRequest2);
        
        const cancelResponse2 = await axios.post(`${BASE_URL}/innova/cancel`, cancelRequest2, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled bet 2: Transaction ${TRANSACTIONS_TO_CANCEL[1]}`);
        console.log(`📋 Cancel response balance: $${cancelResponse2.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Check balance after cancel 2
        let balanceAfter2 = await getCategoryBalance();
        currentBalance = parseBalance(balanceAfter2);
        console.log(`📊 Category balance after cancel 2: $${currentBalance}`);
        
        // Step 4: Cancel bet 1
        console.log('\n🔄 Step 4: Cancelling bet 1...');
        const cancelRequest1 = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: TRANSACTIONS_TO_CANCEL[2],
                type: 'CANCEL'
            }
        };
        cancelRequest1.hash = generateHash(cancelRequest1);
        
        const cancelResponse1 = await axios.post(`${BASE_URL}/innova/cancel`, cancelRequest1, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled bet 1: Transaction ${TRANSACTIONS_TO_CANCEL[2]}`);
        console.log(`📋 Cancel response balance: $${cancelResponse1.data.response.data.balance}`);
        
        await sleep(1000);
        
        // Step 5: Check final balance
        console.log('\n📊 Step 5: Checking final balance...');
        let finalBalanceOutput = await getCategoryBalance();
        console.log('📋 Final database balance:');
        console.log(finalBalanceOutput);
        
        const finalBalance = parseBalance(finalBalanceOutput);
        console.log(`✅ Final category balance: $${finalBalance}`);
        
        const expectedFinalBalance = 50.00;
        console.log(`📊 Expected final balance: $${expectedFinalBalance}`);
        console.log(`📊 Difference: $${(finalBalance - expectedFinalBalance).toFixed(2)}`);
        
        // Step 6: Verify everything is OK
        console.log('\n🔍 Step 6: Verifying final result...');
        const isCorrect = Math.abs(finalBalance - expectedFinalBalance) < 0.01;
        
        if (isCorrect) {
            console.log('✅ SUCCESS: All bets cancelled successfully! Balance returned to $50.00');
        } else {
            console.log('❌ FAILURE: Balance did not return to expected amount!');
        }
        
        // Step 7: Summary
        console.log('\n📋 Step 7: Test Summary');
        console.log('=' .repeat(40));
        console.log(`Initial Balance: $${initialBalance}`);
        console.log(`After Cancel 3: $${parseBalance(balanceAfter3)}`);
        console.log(`After Cancel 2: $${parseBalance(balanceAfter2)}`);
        console.log(`Final Balance: $${finalBalance}`);
        console.log(`Expected Final: $${expectedFinalBalance}`);
        console.log(`Result: ${isCorrect ? '✅ SUCCESS' : '❌ FAILURE'}`);
        
        console.log('\n🎉 Cancel All Bets Test completed!');
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testCancelAllBets(); 