const crypto = require('crypto');

console.log('=== CANCEL MONITOR TEST ===');
console.log('');

// Test cancel request with proper hash
const cancelRequest = {
  command: "cancel",
  data: {
    user_id: "31",
    transaction_id: 2234993,
    round_id: 1349680,
    round_finished: true,
    game_id: 2
  },
  request_timestamp: "2025-08-06 08:39:00"
};

// Generate proper hash
const secretKey = process.env.SUPPLIER_SECRET_KEY || "your_secret_key_here";
const hashData = `${cancelRequest.command}${JSON.stringify(cancelRequest.data)}${cancelRequest.request_timestamp}${secretKey}`;
const hash = crypto.createHash('sha1').update(hashData).digest('hex');
cancelRequest.hash = hash;

console.log('Cancel Request:');
console.log(JSON.stringify(cancelRequest, null, 2));
console.log('');

console.log('CURL Command:');
console.log(`curl -X POST http://localhost:3000/api/innova/cancel \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "x-authorization: ${hash}" \\`);
console.log(`  -H "x-operator-id: thinkcode_stg" \\`);
console.log(`  -d '${JSON.stringify(cancelRequest)}'`);
console.log('');

console.log('Expected: Transaction not found error, but should see cancel processing logs'); 