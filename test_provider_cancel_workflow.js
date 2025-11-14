const crypto = require('crypto');

console.log('=== PROVIDER CANCEL WORKFLOW TEST ===');
console.log('Simulating: Bet -> Cancel -> Check Balance');
console.log('');

// Step 1: Check initial balance
console.log('STEP 1: Check initial balance');
const balanceRequest = {
  command: "balance",
  data: {
    token: "9c82bff6289aa50c793ae966914fe731",
    user_id: "31",
    currency_code: "USD"
  },
  request_timestamp: "2025-08-06 08:11:00"
};

// Generate hash for balance request
const secretKey = process.env.SUPPLIER_SECRET_KEY || "your_secret_key_here";
const balanceHashData = `${balanceRequest.command}${JSON.stringify(balanceRequest.data)}${balanceRequest.request_timestamp}${secretKey}`;
const balanceHash = crypto.createHash('sha1').update(balanceHashData).digest('hex');
balanceRequest.hash = balanceHash;

console.log('Initial Balance Request:');
console.log(JSON.stringify(balanceRequest, null, 2));
console.log('');

// Step 2: Simulate a bet (this would normally come from the provider)
console.log('STEP 2: Simulate a bet transaction');
const betTransactionId = 2234991; // New transaction ID
const betRequest = {
  command: "changebalance",
  data: {
    token: "9c82bff6289aa50c793ae966914fe731",
    user_id: "31",
    transaction_id: betTransactionId,
    transaction_type: "BET",
    amount: "0.20",
    round_id: 1349678,
    round_finished: false,
    game_id: 2
  },
  request_timestamp: "2025-08-06 08:32:00"
};

// Generate hash for bet request
const betHashData = `${betRequest.command}${JSON.stringify(betRequest.data)}${betRequest.request_timestamp}${secretKey}`;
const betHash = crypto.createHash('sha1').update(betHashData).digest('hex');
betRequest.hash = betHash;

console.log('Bet Request:');
console.log(JSON.stringify(betRequest, null, 2));
console.log('');

// Step 3: Cancel the bet
console.log('STEP 3: Cancel the bet transaction');
const cancelRequest = {
  command: "cancel",
  data: {
    user_id: "31",
    transaction_id: betTransactionId,
    round_id: 1349678,
    round_finished: true,
    game_id: 2
  },
  request_timestamp: "2025-08-06 08:32:30"
};

// Generate hash for cancel request
const cancelHashData = `${cancelRequest.command}${JSON.stringify(cancelRequest.data)}${cancelRequest.request_timestamp}${secretKey}`;
const cancelHash = crypto.createHash('sha1').update(cancelHashData).digest('hex');
cancelRequest.hash = cancelHash;

console.log('Cancel Request:');
console.log(JSON.stringify(cancelRequest, null, 2));
console.log('');

// Step 4: Check balance after cancel
console.log('STEP 4: Check balance after cancel');
const balanceAfterRequest = {
  command: "balance",
  data: {
    token: "9c82bff6289aa50c793ae966914fe731",
    user_id: "31",
    currency_code: "USD"
  },
  request_timestamp: "2025-08-06 08:33:00"
};

// Generate hash for balance after request
const balanceAfterHashData = `${balanceAfterRequest.command}${JSON.stringify(balanceAfterRequest.data)}${balanceAfterRequest.request_timestamp}${secretKey}`;
const balanceAfterHash = crypto.createHash('sha1').update(balanceAfterHashData).digest('hex');
balanceAfterRequest.hash = balanceAfterHash;

console.log('Balance After Cancel Request:');
console.log(JSON.stringify(balanceAfterRequest, null, 2));
console.log('');

// Generate curl commands
console.log('=== CURL COMMANDS TO TEST ===');
console.log('');

console.log('1. Check initial balance:');
console.log(`curl -X POST http://localhost:3000/api/innova/balance \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${balanceHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(balanceRequest)}'`);
console.log('');

console.log('2. Make a bet (simulate provider bet):');
console.log(`curl -X POST http://localhost:3000/api/innova/changebalance \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${betHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(betRequest)}'`);
console.log('');

console.log('3. Cancel the bet:');
console.log(`curl -X POST http://localhost:3000/api/innova/cancel \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${cancelHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(cancelRequest)}'`);
console.log('');

console.log('4. Check balance after cancel:');
console.log(`curl -X POST http://localhost:3000/api/innova/balance \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${balanceAfterHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(balanceAfterRequest)}'`);
console.log('');

console.log('=== EXPECTED RESULT ===');
console.log('After the fix:');
console.log('- Step 1: Initial category balance (e.g., $99.45)');
console.log('- Step 2: Bet reduces category balance (e.g., $99.25)');
console.log('- Step 3: Cancel returns category balance (e.g., $99.45)');
console.log('- Step 4: Balance check shows same category balance (e.g., $99.45)');
console.log('- Steps 1, 3, and 4 should show consistent category balance'); 