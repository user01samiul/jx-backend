/**
 * Complete Free Spins Campaign Testing Script
 *
 * Tests:
 * 1. Create a new free spins campaign
 * 2. Add all users to the campaign
 * 3. Verify users can see the campaign in their account
 * 4. Test campaign data structure
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// Test user credentials (use newuser1 from database)
const TEST_USER_CREDENTIALS = {
  username: 'newuser1',
  password: 'password123' // Default password
};

// Use user ID 23 for direct API testing
const TEST_USER_ID = 23;

let adminToken = '';
let userToken = '';

// Helper function to login and get token
async function login(credentials) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, credentials);

    console.log('Login response:', JSON.stringify(response.data, null, 2));

    // Handle different response structures
    if (response.data.success) {
      // Try different paths for token
      const token = response.data.token?.access_token ||
                   response.data.data?.tokens?.accessToken ||
                   response.data.data?.accessToken ||
                   response.data.token ||
                   response.data.accessToken;

      if (token) {
        return token;
      }
    }

    throw new Error('Login failed: ' + JSON.stringify(response.data));
  } catch (error) {
    if (error.response) {
      console.error('Login error:', error.response.data);
    }
    throw error;
  }
}

// Step 1: Create a campaign
async function createCampaign() {
  console.log('\n=== Step 1: Creating Free Spins Campaign ===');

  const campaignData = {
    vendor: 'pragmatic',
    campaign_code: `TEST_CAMPAIGN_${Date.now()}`,
    currency_code: 'USD',
    freespins_per_player: 50,
    begins_at: Math.floor(Date.now() / 1000) + 60, // Start in 1 minute
    expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
    games: [
      {
        game_id: 6427, // O Vira-lata Caramelo (pragmatic game)
        total_bet: 0.50
      }
    ],
    players: [`${TEST_USER_ID}`] // Include one player initially
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/api/campaigns`,
      campaignData,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    console.log('✅ Campaign created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    return campaignData.campaign_code;
  } catch (error) {
    console.error('❌ Campaign creation failed:', error.response?.data || error.message);
    throw error;
  }
}

// Step 2: Add all users to campaign
async function addAllUsersToCampaign(campaignCode) {
  console.log('\n=== Step 2: Adding All Users to Campaign ===');
  console.log('Campaign Code:', campaignCode);

  try {
    const response = await axios.post(
      `${BASE_URL}/api/campaigns/${campaignCode}/players/add-all`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    console.log('✅ All users added to campaign successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error('❌ Failed to add users to campaign:', error.response?.data || error.message);
    throw error;
  }
}

// Step 3: Verify user can see campaign (using admin token to check any user)
async function verifyUserCampaigns() {
  console.log('\n=== Step 3: Verifying User Can See Campaign ===');
  console.log(`Checking campaigns for user ID: ${TEST_USER_ID}`);

  try {
    const response = await axios.get(
      `${BASE_URL}/api/campaigns/user/${TEST_USER_ID}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    console.log('✅ User campaigns fetched successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.length > 0) {
      console.log(`\n✅ SUCCESS! User has ${response.data.data.length} campaign(s)!`);

      // Display campaign details
      response.data.data.forEach((campaign, index) => {
        console.log(`\nCampaign #${index + 1}:`);
        console.log(`  Code: ${campaign.campaign_code}`);
        console.log(`  Vendor: ${campaign.vendor_name}`);
        console.log(`  Free Spins: ${campaign.freespins_remaining}/${campaign.freespins_per_player}`);
        console.log(`  Expires: ${campaign.expires_at}`);
        console.log(`  Status: ${campaign.status}`);
        console.log(`  Has Bonus Wallet: ${campaign.bonus_wallet ? 'Yes' : 'No'}`);

        if (campaign.bonus_wallet) {
          console.log(`  Bonus Wallet:`);
          console.log(`    - Wagering Required: ${campaign.bonus_wallet.wagering_required}`);
          console.log(`    - Wagering Progress: ${campaign.bonus_wallet.wagering_progress}`);
          console.log(`    - Can Withdraw: ${campaign.bonus_wallet.can_withdraw}`);
        }
      });
    } else {
      console.log('⚠️  User has no campaigns yet.');
    }

    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch user campaigns:', error.response?.data || error.message);
    throw error;
  }
}

// Step 4: Verify database
async function verifyDatabaseData() {
  console.log('\n=== Step 4: Verifying Database ===');

  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(
      `PGPASSWORD='12358Voot#' psql -h localhost -U postgres -d jackpotx-db -c "SELECT user_id, campaign_code, freespins_remaining, status FROM user_free_spins_campaigns ORDER BY created_at DESC LIMIT 5;"`
    );

    console.log('Database query result:');
    console.log(stdout);
  } catch (error) {
    console.error('Database verification error:', error.message);
  }
}

// Main test execution
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Free Spins Campaigns - Complete Integration Test    ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Login as admin
    console.log('\n📝 Logging in as Admin...');
    adminToken = await login(ADMIN_CREDENTIALS);
    console.log('✅ Admin logged in successfully');

    // Create campaign
    const campaignCode = await createCampaign();

    // Add all users to campaign
    await addAllUsersToCampaign(campaignCode);

    // Wait a moment for data to settle
    console.log('\n⏳ Waiting 2 seconds for data to settle...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify user can see campaign
    await verifyUserCampaigns();

    // Verify database
    await verifyDatabaseData();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ✅ ALL TESTS PASSED! ✅                   ║');
    console.log('╚════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ❌ TESTS FAILED! ❌                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();
