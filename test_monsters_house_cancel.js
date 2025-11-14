const axios = require('axios');
const crypto = require('crypto');

// Test the cancel API endpoint for Monsters House game
async function testMonstersHouseCancel() {
  console.log('=== Testing Cancel API for Monsters House Game ===');
  
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
      user_id: '43',
      transaction_id: 'test_monsters_win_2' // The second win transaction
    }
  };

  try {
    console.log('Sending cancel request for Monsters House:', JSON.stringify(testData, null, 2));
    
    // Call the cancel endpoint
    const response = await axios.post('http://localhost:3000/innova/cancel', testData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': authHash
      }
    });

    console.log('Cancel API Response for Monsters House:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing cancel API for Monsters House:', error.response?.data || error.message);
  }
}

testMonstersHouseCancel(); 