const axios = require('axios');
const crypto = require('crypto');

// Test the cancel API endpoint
async function testCancelAPI() {
  console.log('=== Testing Cancel API ===');
  
  const SECRET_KEY = '2xk3SrX09oQ71Z3F';
  const command = 'cancel';
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  // Generate authorization hash
  const authHash = crypto.createHash('sha1').update(command + SECRET_KEY).digest('hex');
  
  // Generate request hash
  const requestHash = crypto.createHash('sha1').update(command + timestamp + SECRET_KEY).digest('hex');
  
  console.log('Auth hash:', authHash);
  console.log('Request hash:', requestHash);
  
  const testData = {
    command: command,
    request_timestamp: timestamp,
    hash: requestHash,
    data: {
      user_id: '50',
      transaction_id: 'test_api_cancel_win_456' // Using the transaction we created
    }
  };

  try {
    console.log('Sending cancel request:', JSON.stringify(testData, null, 2));
    
    // Call the cancel endpoint
    const response = await axios.post('http://localhost:3000/innova/cancel', testData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': authHash
      }
    });

    console.log('Cancel API Response:', JSON.stringify(response.data, null, 2));
    
    // Check the balance after cancellation
    const balanceCommand = 'balance';
    const balanceTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const balanceAuthHash = crypto.createHash('sha1').update(balanceCommand + SECRET_KEY).digest('hex');
    const balanceRequestHash = crypto.createHash('sha1').update(balanceCommand + balanceTimestamp + SECRET_KEY).digest('hex');
    
    const balanceResponse = await axios.post('http://localhost:3000/innova/balance', {
      command: balanceCommand,
      request_timestamp: balanceTimestamp,
      hash: balanceRequestHash,
      data: {
        user_id: '50',
        category: 'slots'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': balanceAuthHash
      }
    });

    console.log('Balance after cancellation:', JSON.stringify(balanceResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing cancel API:', error.response?.data || error.message);
  }
}

testCancelAPI(); 