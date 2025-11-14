const crypto = require('crypto');

// Test the existing transaction 2234989 that we know exists
const transactionId = 2234989;

console.log('=== PROVIDER WORKFLOW TEST ===');
console.log(`Testing transaction: ${transactionId}`);
console.log('');

// Step 1: Check current balance
console.log('STEP 1: Check current balance');
const balanceRequest = {
  command: "balance",
  data: {
    token: "9c82bff6289aa50c793ae966914fe731",
    user_id: "31",
    currency_code: "USD"
  },
  request_timestamp: "2025-08-06 08:25:00"
};

// Generate hash for balance request
const secretKey = process.env.SUPPLIER_SECRET_KEY || "your_secret_key_here";
const balanceHashData = `${balanceRequest.command}${JSON.stringify(balanceRequest.data)}${balanceRequest.request_timestamp}${secretKey}`;
const balanceHash = crypto.createHash('sha1').update(balanceHashData).digest('hex');
balanceRequest.hash = balanceHash;

console.log('Balance Request:');
console.log(JSON.stringify(balanceRequest, null, 2));
console.log('');

// Step 2: Cancel the transaction
console.log('STEP 2: Cancel transaction');
const cancelRequest = {
  command: "cancel",
  data: {
    user_id: "31",
    transaction_id: transactionId,
    round_id: 1349676,
    round_finished: true,
    game_id: 2
  },
  request_timestamp: "2025-08-06 08:25:30"
};

// Generate hash for cancel request
const cancelHashData = `${cancelRequest.command}${JSON.stringify(cancelRequest.data)}${cancelRequest.request_timestamp}${secretKey}`;
const cancelHash = crypto.createHash('sha1').update(cancelHashData).digest('hex');
cancelRequest.hash = cancelHash;

console.log('Cancel Request:');
console.log(JSON.stringify(cancelRequest, null, 2));
console.log('');

// Step 3: Check balance again
console.log('STEP 3: Check balance after cancel');
const balanceAfterRequest = {
  command: "balance",
  data: {
    token: "9c82bff6289aa50c793ae966914fe731",
    user_id: "31",
    currency_code: "USD"
  },
  request_timestamp: "2025-08-06 08:26:00"
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

console.log('2. Cancel transaction:');
console.log(`curl -X POST http://localhost:3000/api/innova/cancel \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${cancelHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(cancelRequest)}'`);
console.log('');

console.log('3. Check balance after cancel:');
console.log(`curl -X POST http://localhost:3000/api/innova/balance \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${balanceAfterHash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(balanceAfterRequest)}'`);
console.log('');

console.log('=== EXPECTED RESULT ===');
console.log('After the fix:');
console.log('- Step 1 balance should show main wallet balance');
console.log('- Step 2 cancel should show main wallet balance');
console.log('- Step 3 balance should show the SAME main wallet balance');
console.log('- All three should return consistent values'); 