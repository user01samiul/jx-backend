const axios = require('axios');
const crypto = require('crypto');

// Test the cancel API endpoint for user 48
async function testCancelUser48() {
  console.log('=== Testing Cancel API for User 48 ===');
  
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
      user_id: '48',
      transaction_id: '2237319' // The win transaction ID
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
    
  } catch (error) {
    console.error('Error testing cancel API:', error.response?.data || error.message);
  }
}

testCancelUser48(); 