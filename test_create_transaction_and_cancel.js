const crypto = require('crypto');

console.log('=== CREATE TRANSACTION AND CANCEL TEST ===');
console.log('Simulating: Create Bet -> Cancel Transaction -> Check Balance');
console.log('');

// Step 1: Create a bet transaction
console.log('STEP 1: Create Bet Transaction');
const betRequest = {
  command: "changebalance",
  data: {
    token: "9c82bff6289aa50c793ae966914fe731",
    user_id: "31",
    transaction_id: 2234994,
    transaction_type: "BET",
    amount: "0.25",
    round_id: 1349681,
    round_finished: false,
    game_id: 2
  },
  request_timestamp: "2025-08-06 08:45:00"
};

// Generate hash for bet request
const secretKey = process.env.SUPPLIER_SECRET_KEY || "your_secret_key_here";
const betHashData = `${betRequest.command}${JSON.stringify(betRequest.data)}${betRequest.request_timestamp}${secretKey}`;
const betHash = crypto.createHash('sha1').update(betHashData).digest('hex');
betRequest.hash = betHash;

console.log('Bet Request:');
console.log(JSON.stringify(betRequest, null, 2));
console.log('');

console.log('CURL Command for Bet:');
console.log(`curl -X POST http://localhost:3000/api/innova/changebalance \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${betHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(betRequest)}'`);
console.log('');

// Step 2: Cancel the transaction
console.log('STEP 2: Cancel Transaction');
const cancelRequest = {
  command: "cancel",
  data: {
    user_id: "31",
    transaction_id: 2234994,
    round_id: 1349681,
    round_finished: true,
    game_id: 2
  },
  request_timestamp: "2025-08-06 08:46:00"
};

// Generate hash for cancel request
const cancelHashData = `${cancelRequest.command}${JSON.stringify(cancelRequest.data)}${cancelRequest.request_timestamp}${secretKey}`;
const cancelHash = crypto.createHash('sha1').update(cancelHashData).digest('hex');
cancelRequest.hash = cancelHash;

console.log('Cancel Request:');
console.log(JSON.stringify(cancelRequest, null, 2));
console.log('');

console.log('CURL Command for Cancel:');
console.log(`curl -X POST http://localhost:3000/api/innova/cancel \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${cancelHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(cancelRequest)}'`);
console.log('');

// Step 3: Check balance after cancel
console.log('STEP 3: Check Balance After Cancel');
const balanceRequest = {
  command: "balance",
  data: {
    token: "9c82bff6289aa50c793ae966914fe731",
    user_id: "31",
    currency_code: "USD"
  },
  request_timestamp: "2025-08-06 08:47:00"
};

// Generate hash for balance request
const balanceHashData = `${balanceRequest.command}${JSON.stringify(balanceRequest.data)}${balanceRequest.request_timestamp}${secretKey}`;
const balanceHash = crypto.createHash('sha1').update(balanceHashData).digest('hex');
balanceRequest.hash = balanceHash;

console.log('Balance Request:');
console.log(JSON.stringify(balanceRequest, null, 2));
console.log('');

console.log('CURL Command for Balance:');
console.log(`curl -X POST http://localhost:3000/api/innova/balance \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${balanceHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(balanceRequest)}'`);
console.log('');

console.log('=== TEST WORKFLOW ===');
console.log('1. Execute Bet CURL command');
console.log('2. Execute Cancel CURL command');
console.log('3. Execute Balance CURL command');
console.log('4. Check logs for balance consistency'); 