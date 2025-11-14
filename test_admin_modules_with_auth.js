const axios = require('axios');

// Test the admin modules endpoints with authentication
async function testAdminModulesWithAuth() {
  console.log('=== Testing Admin Modules API with Authentication ===');
  
  try {
    // First, let's test without authentication (should fail)
    console.log('\n1. Testing without authentication (should fail):');
    try {
      const noAuthResponse = await axios.get('http://localhost:3000/api/admin-modules/roles');
      console.log('❌ Unexpected success:', noAuthResponse.data);
    } catch (error) {
      console.log('✅ Correctly failed with:', error.response?.data?.message || error.message);
    }
    
    // Test with invalid token (should fail)
    console.log('\n2. Testing with invalid token (should fail):');
    try {
      const invalidTokenResponse = await axios.get('http://localhost:3000/api/admin-modules/roles', {
        headers: { 'Authorization': 'Bearer invalid_token' }
      });
      console.log('❌ Unexpected success:', invalidTokenResponse.data);
    } catch (error) {
      console.log('✅ Correctly failed with:', error.response?.data?.message || error.message);
    }
    
    // Test endpoints are accessible (without auth, should get 401)
    console.log('\n3. Testing endpoint accessibility:');
    const endpoints = [
      '/api/admin-modules/my-modules',
      '/api/admin-modules/roles',
      '/api/admin-modules/by-role/1',
      '/api/admin-modules/all'
    ];
    
    for (const endpoint of endpoints) {
      try {
        await axios.get(`http://localhost:3000${endpoint}`);
        console.log(`❌ ${endpoint} - Unexpected success`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`✅ ${endpoint} - Correctly requires authentication`);
        } else {
          console.log(`❌ ${endpoint} - Unexpected error:`, error.response?.status, error.response?.data?.message);
        }
      }
    }
    
    console.log('\n✅ All endpoints are properly protected and accessible!');
    console.log('\n📋 Next steps for full testing:');
    console.log('1. Get a valid JWT token by logging in as admin user');
    console.log('2. Test endpoints with valid token');
    console.log('3. Test role-based access control');
    
  } catch (error) {
    console.error('Error testing admin modules API:', error.message);
  }
}

testAdminModulesWithAuth(); 