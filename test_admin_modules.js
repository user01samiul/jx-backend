const axios = require('axios');

// Test the admin modules endpoints
async function testAdminModules() {
  console.log('=== Testing Admin Modules API ===');
  
  try {
    // First, let's test getting modules for a specific role
    console.log('\n1. Testing get modules by role (Admin role = 1):');
    const roleResponse = await axios.get('http://localhost:3000/api/admin-modules/by-role/1');
    console.log('Response:', JSON.stringify(roleResponse.data, null, 2));
    
    // Test getting all modules
    console.log('\n2. Testing get all modules:');
    const allModulesResponse = await axios.get('http://localhost:3000/api/admin-modules/all');
    console.log('Response:', JSON.stringify(allModulesResponse.data, null, 2));
    
    // Test getting available roles
    console.log('\n3. Testing get available roles:');
    const rolesResponse = await axios.get('http://localhost:3000/api/admin-modules/roles');
    console.log('Response:', JSON.stringify(rolesResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing admin modules API:', error.response?.data || error.message);
  }
}

testAdminModules(); 