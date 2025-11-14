const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000';
const USER_ID = 48;
const GAME_ID = 34; // Game ID from the BET transactions
const USER_TOKEN = 'cecb0fc413ae3f38ad0583965ba90a91';

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

async function testCancelBetTransactions() {
    console.log('🎮 Starting Cancel BET Transactions Test for User 48');
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
        
        // Step 2: Cancel the 1st BET transaction (ID 2148)
        console.log('\n🔄 Step 2: Cancelling the 1st BET transaction (ID 2148)...');
        const cancel1Request = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: '2236081', // Provider transaction ID from ID 2148
                type: 'CANCEL'
            }
        };
        cancel1Request.hash = generateHash(cancel1Request);
        
        const cancel1Response = await axios.post(`${BASE_URL}/innova/cancel`, cancel1Request, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled 1st BET transaction: 2236081`);
        console.log(`📋 Cancel response:`, cancel1Response.data);
        
        // Step 3: Check balance after 1st cancel
        console.log('\n📊 Step 3: Checking balance after 1st cancel...');
        const balanceAfterCancel1Response = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const balanceAfterCancel1 = balanceAfterCancel1Response.data.response.data.balance;
        console.log(`✅ Balance after 1st cancel: $${balanceAfterCancel1}`);
        
        // Step 4: Cancel the 2nd BET transaction (ID 2149)
        console.log('\n🔄 Step 4: Cancelling the 2nd BET transaction (ID 2149)...');
        const cancel2Request = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: '2236083', // Provider transaction ID from ID 2149
                type: 'CANCEL'
            }
        };
        cancel2Request.hash = generateHash(cancel2Request);
        
        const cancel2Response = await axios.post(`${BASE_URL}/innova/cancel`, cancel2Request, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled 2nd BET transaction: 2236083`);
        console.log(`📋 Cancel response:`, cancel2Response.data);
        
        // Step 5: Check final balance after 2nd cancel
        console.log('\n📊 Step 5: Checking final balance after 2nd cancel...');
        const finalBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const finalBalance = finalBalanceResponse.data.response.data.balance;
        console.log(`✅ Final balance after 2nd cancel: $${finalBalance}`);
        
        // Step 6: Calculate expected balances
        console.log('\n🧮 Step 6: Calculating expected balances...');
        const expectedBalanceAfterCancel1 = initialBalance + 0.10; // First bet was $0.10
        const expectedFinalBalance = initialBalance + 0.10 + 0.10; // Both bets were $0.10
        
        console.log(`📊 Expected balance after 1st cancel: $${expectedBalanceAfterCancel1}`);
        console.log(`📊 Actual balance after 1st cancel: $${balanceAfterCancel1}`);
        console.log(`📊 Difference after 1st cancel: $${(balanceAfterCancel1 - expectedBalanceAfterCancel1).toFixed(2)}`);
        
        console.log(`📊 Expected final balance: $${expectedFinalBalance}`);
        console.log(`📊 Actual final balance: $${finalBalance}`);
        console.log(`📊 Final difference: $${(finalBalance - expectedFinalBalance).toFixed(2)}`);
        
        // Step 7: Check category balance in database
        console.log('\n📊 Step 7: Checking category balance in database...');
        console.log('🔍 Run this command to check category balance:');
        console.log(`docker exec -it pg_db psql -U postgres -d jackpotx-db -c "SELECT user_id, category, balance FROM user_category_balances WHERE user_id = ${USER_ID};"`);
        
        console.log('\n🎉 Cancel BET transactions test completed!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testCancelBetTransactions(); 