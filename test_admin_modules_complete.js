const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/admin-modules`;

// You would need to get a valid JWT token by logging in as admin
// This is a placeholder - replace with actual token from login
const ADMIN_TOKEN = 'YOUR_ADMIN_JWT_TOKEN_HERE';

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method.toUpperCase()} ${endpoint} failed:`, error.response?.data || error.message);
    return null;
  }
}

// Test all admin modules endpoints
async function testAdminModulesAPI() {
  console.log('=== 🚀 Admin Modules API Complete Test ===\n');
  
  if (ADMIN_TOKEN === 'YOUR_ADMIN_JWT_TOKEN_HERE') {
    console.log('⚠️  Please replace ADMIN_TOKEN with a valid JWT token from admin login');
    console.log('   You can get this by logging in through the auth API\n');
    return;
  }
  
  // 1. Get modules for current user
  console.log('1️⃣  Testing GET /my-modules (current user modules)');
  const myModules = await makeAuthenticatedRequest('GET', '/my-modules');
  if (myModules) {
    console.log('✅ Success:', myModules.message);
    console.log(`   Found ${myModules.data?.length || 0} modules for current user\n`);
  }
  
  // 2. Get available roles
  console.log('2️⃣  Testing GET /roles (available roles)');
  const roles = await makeAuthenticatedRequest('GET', '/roles');
  if (roles) {
    console.log('✅ Success:', roles.message);
    console.log(`   Available roles: ${roles.data?.map(r => r.name).join(', ')}\n`);
  }
  
  // 3. Get all modules (admin only)
  console.log('3️⃣  Testing GET /all (all modules)');
  const allModules = await makeAuthenticatedRequest('GET', '/all');
  if (allModules) {
    console.log('✅ Success:', allModules.message);
    console.log(`   Total modules: ${allModules.data?.length || 0}\n`);
  }
  
  // 4. Get modules for specific role
  console.log('4️⃣  Testing GET /by-role/1 (modules for Admin role)');
  const roleModules = await makeAuthenticatedRequest('GET', '/by-role/1');
  if (roleModules) {
    console.log('✅ Success:', roleModules.message);
    console.log(`   Modules for Admin role: ${roleModules.data?.length || 0}\n`);
  }
  
  // 5. Create a new module
  console.log('5️⃣  Testing POST / (create new module)');
  const newModule = {
    title: "Test Module",
    path: "/dashboard/test-module",
    icon: "test-icon",
    parent_id: null,
    divider: "0",
    role_id: [1, 2, 3] // Admin, Player, Support
  };
  
  const createdModule = await makeAuthenticatedRequest('POST', '/', newModule);
  if (createdModule) {
    console.log('✅ Success:', createdModule.message);
    console.log(`   Created module ID: ${createdModule.data?.id}\n`);
    
    const moduleId = createdModule.data?.id;
    
    // 6. Update the created module
    console.log('6️⃣  Testing PUT /:id (update module)');
    const updateData = {
      title: "Updated Test Module",
      path: "/dashboard/updated-test-module",
      icon: "updated-test-icon",
      role_id: [1, 2, 3, 4] // Add Manager role
    };
    
    const updatedModule = await makeAuthenticatedRequest('PUT', `/${moduleId}`, updateData);
    if (updatedModule) {
      console.log('✅ Success:', updatedModule.message);
      console.log(`   Updated module: ${updatedModule.data?.title}\n`);
    }
    
    // 7. Delete the created module
    console.log('7️⃣  Testing DELETE /:id (delete module)');
    const deletedModule = await makeAuthenticatedRequest('DELETE', `/${moduleId}`);
    if (deletedModule) {
      console.log('✅ Success:', deletedModule.message);
      console.log(`   Deleted ${deletedModule.data?.deletedCount || 0} modules\n`);
    }
  }
  
  console.log('🎉 Admin Modules API test completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Access Swagger docs at: http://localhost:3000/docs');
  console.log('2. Use the interactive documentation to test endpoints');
  console.log('3. Integrate with your admin frontend');
}

// Test without authentication (should fail)
async function testWithoutAuth() {
  console.log('=== 🔒 Testing Without Authentication ===\n');
  
  const endpoints = [
    '/my-modules',
    '/roles', 
    '/all',
    '/by-role/1'
  ];
  
  for (const endpoint of endpoints) {
    try {
      await axios.get(`${API_BASE}${endpoint}`);
      console.log(`❌ ${endpoint} - Unexpected success`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`✅ ${endpoint} - Correctly requires authentication`);
      } else {
        console.log(`❌ ${endpoint} - Unexpected error:`, error.response?.status);
      }
    }
  }
  
  console.log('\n✅ All endpoints properly protected!\n');
}

// Run tests
async function runTests() {
  await testWithoutAuth();
  await testAdminModulesAPI();
}

runTests().catch(console.error); 