const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000';
const USER_ID = 48;
const GAME_ID = 45;
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

async function testGame45CancelScenario() {
    console.log('🎮 Starting Game 45 Cancel Scenario Test for User 48');
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
        
        // Step 2: Place 1st bet of $0.20
        console.log('\n🎲 Step 2: Placing 1st bet of $0.20...');
        const bet1Request = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                transaction_id: `test_game45_bet1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                amount: -0.20,
                type: 'BET'
            }
        };
        bet1Request.hash = generateHash(bet1Request);
        
        const bet1Response = await axios.post(`${BASE_URL}/innova/changebalance`, bet1Request, {
            headers: {
                'X-Authorization': generateAuthHeader('changebalance')
            }
        });
        
        console.log(`✅ 1st bet placed: $0.20`);
        console.log(`📋 Bet response:`, bet1Response.data);
        
        await sleep(1000); // Wait 1 second
        
        // Step 3: Place 2nd bet of $0.20
        console.log('\n🎲 Step 3: Placing 2nd bet of $0.20...');
        const bet2Request = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                transaction_id: `test_game45_bet2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                amount: -0.20,
                type: 'BET'
            }
        };
        bet2Request.hash = generateHash(bet2Request);
        
        const bet2Response = await axios.post(`${BASE_URL}/innova/changebalance`, bet2Request, {
            headers: {
                'X-Authorization': generateAuthHeader('changebalance')
            }
        });
        
        console.log(`✅ 2nd bet placed: $0.20`);
        console.log(`📋 Bet response:`, bet2Response.data);
        
        await sleep(1000); // Wait 1 second
        
        // Step 4: Place win of $0.12
        console.log('\n🎉 Step 4: Placing win of $0.12...');
        const winRequest = {
            command: 'changebalance',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                game_id: GAME_ID,
                transaction_id: `test_game45_win_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                amount: 0.12,
                type: 'WIN'
            }
        };
        winRequest.hash = generateHash(winRequest);
        
        const winResponse = await axios.post(`${BASE_URL}/innova/changebalance`, winRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('changebalance')
            }
        });
        
        console.log(`✅ Win placed: $0.12`);
        console.log(`📋 Win response:`, winResponse.data);
        
        await sleep(1000); // Wait 1 second
        
        // Step 5: Check balance after all transactions
        console.log('\n📊 Step 5: Checking balance after all transactions...');
        const balanceAfterTransactionsResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const balanceAfterTransactions = balanceAfterTransactionsResponse.data.response.data.balance;
        console.log(`✅ Balance after all transactions: $${balanceAfterTransactions}`);
        
        // Calculate expected balance: $50.00 - $0.20 - $0.20 + $0.12 = $49.72
        const expectedBalanceAfterTransactions = 50.00 - 0.20 - 0.20 + 0.12;
        console.log(`📊 Expected balance: $${expectedBalanceAfterTransactions}`);
        console.log(`📊 Difference: $${(balanceAfterTransactions - expectedBalanceAfterTransactions).toFixed(2)}`);
        
        // Step 6: Cancel 1st bet
        console.log('\n🔄 Step 6: Cancelling 1st bet...');
        const cancel1Request = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: bet1Request.data.transaction_id,
                type: 'CANCEL'
            }
        };
        cancel1Request.hash = generateHash(cancel1Request);
        
        const cancel1Response = await axios.post(`${BASE_URL}/innova/cancel`, cancel1Request, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled 1st bet`);
        console.log(`📋 Cancel response:`, cancel1Response.data);
        
        // Step 7: Check balance after 1st cancel
        console.log('\n📊 Step 7: Checking balance after 1st cancel...');
        const balanceAfterCancel1Response = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const balanceAfterCancel1 = balanceAfterCancel1Response.data.response.data.balance;
        console.log(`✅ Balance after 1st cancel: $${balanceAfterCancel1}`);
        
        // Expected: $49.72 + $0.20 = $49.92
        const expectedBalanceAfterCancel1 = expectedBalanceAfterTransactions + 0.20;
        console.log(`📊 Expected balance after 1st cancel: $${expectedBalanceAfterCancel1}`);
        console.log(`📊 Difference: $${(balanceAfterCancel1 - expectedBalanceAfterCancel1).toFixed(2)}`);
        
        // Step 8: Cancel 2nd bet
        console.log('\n🔄 Step 8: Cancelling 2nd bet...');
        const cancel2Request = {
            command: 'cancel',
            request_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            hash: '',
            data: {
                token: USER_TOKEN,
                user_id: USER_ID,
                transaction_id: bet2Request.data.transaction_id,
                type: 'CANCEL'
            }
        };
        cancel2Request.hash = generateHash(cancel2Request);
        
        const cancel2Response = await axios.post(`${BASE_URL}/innova/cancel`, cancel2Request, {
            headers: {
                'X-Authorization': generateAuthHeader('cancel')
            }
        });
        
        console.log(`✅ Cancelled 2nd bet`);
        console.log(`📋 Cancel response:`, cancel2Response.data);
        
        // Step 9: Check final balance after 2nd cancel
        console.log('\n📊 Step 9: Checking final balance after 2nd cancel...');
        const finalBalanceResponse = await axios.post(`${BASE_URL}/innova/balance`, balanceRequest, {
            headers: {
                'X-Authorization': generateAuthHeader('balance')
            }
        });
        
        const finalBalance = finalBalanceResponse.data.response.data.balance;
        console.log(`✅ Final balance after 2nd cancel: $${finalBalance}`);
        
        // Expected: $49.92 + $0.20 = $50.12 (but should be $50.00 since we're cancelling bets, not wins)
        const expectedFinalBalance = expectedBalanceAfterCancel1 + 0.20;
        console.log(`📊 Expected final balance: $${expectedFinalBalance}`);
        console.log(`📊 Difference: $${(finalBalance - expectedFinalBalance).toFixed(2)}`);
        
        // Step 10: Check category balance in database
        console.log('\n📊 Step 10: Checking category balance in database...');
        console.log('🔍 Run this command to check category balance:');
        console.log(`docker exec -it pg_db psql -U postgres -d jackpotx-db -c "SELECT user_id, category, balance FROM user_category_balances WHERE user_id = ${USER_ID};"`);
        
        console.log('\n🎉 Game 45 cancel scenario test completed!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('❌ Error during test:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testGame45CancelScenario(); 