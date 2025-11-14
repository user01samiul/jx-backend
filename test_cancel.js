const crypto = require('crypto');

// Test data - simulating provider cancel request
const testData = {
  command: "cancel",
  data: {
    user_id: "31",
    transaction_id: 2234990, // New transaction ID for testing
    round_id: 1349677,
    round_finished: true,
    game_id: 2
  },
  request_timestamp: "2025-08-06 08:15:00"
};

// Generate hash like the provider does
const secretKey = process.env.SUPPLIER_SECRET_KEY || "your_secret_key_here";
const hashData = `${testData.command}${JSON.stringify(testData.data)}${testData.request_timestamp}${secretKey}`;
const hash = crypto.createHash('sha1').update(hashData).digest('hex');

// Add hash to request
testData.hash = hash;

console.log('=== PROVIDER CANCEL TEST ===');
console.log('Test Cancel Request:');
console.log(JSON.stringify(testData, null, 2));

// Simulate the request
const requestBody = JSON.stringify(testData);
const authHeader = hash;

console.log('\n=== CURL COMMAND TO TEST ===');
console.log(`curl -X POST http://localhost:3000/api/innova/cancel \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${authHeader}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${requestBody}'`);

console.log('\n=== EXPECTED RESULT ===');
console.log('After the fix, both cancel and balance should return the same main wallet balance');
console.log('Cancel response should show: balance: [main_wallet_balance]');
console.log('Balance check should show: balance: [same_main_wallet_balance]'); 