const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Check Category Balances for User 48
async function checkCategoryBalances() {
  try {
    console.log('💰 **CATEGORY BALANCES ANALYSIS FOR USER 48**');
    console.log('============================================');
    
    // Get category balances
    const categoryBalancesResponse = await axios.get(`${BASE_URL}/api/admin/category-balances`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (!categoryBalancesResponse.data.success || !categoryBalancesResponse.data.data) {
      console.log('❌ Failed to get category balances');
      return;
    }

    const categoryBalances = categoryBalancesResponse.data.data;
    
    // Filter for user 48
    const user48CategoryBalances = categoryBalances.filter(cb => cb.user_id === 48);
    
    console.log(`📊 **USER 48 CATEGORY BALANCES**`);
    console.log(`Total category balance records: ${user48CategoryBalances.length}`);
    
    if (user48CategoryBalances.length > 0) {
      user48CategoryBalances.forEach((cb, index) => {
        console.log(`${index + 1}. Category: ${cb.category}`);
        console.log(`   Balance: $${cb.balance}`);
        console.log(`   User ID: ${cb.user_id}`);
        console.log(`   Username: ${cb.username}`);
        console.log(`   Created: ${cb.created_at}`);
        console.log(`   Updated: ${cb.updated_at}`);
        console.log('');
      });
    } else {
      console.log('No category balance records found for user 48');
    }
    
    // Check current balance
    console.log('💰 **CURRENT BALANCE**');
    const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (balanceResponse.data.success && balanceResponse.data.data) {
      const data = balanceResponse.data.data;
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      console.log(`Slot Wallet: $${data.slot_balance || 0}`);
      console.log(`Category Balances:`, data.category_balances || {});
    }
    
    // Check all users category balances to see if there's a pattern
    console.log('\n🔍 **ALL USERS CATEGORY BALANCES (SLOTS)**');
    const slotsCategoryBalances = categoryBalances.filter(cb => cb.category === 'slots');
    
    if (slotsCategoryBalances.length > 0) {
      slotsCategoryBalances.slice(0, 10).forEach((cb, index) => {
        console.log(`${index + 1}. User ID: ${cb.user_id} | Username: ${cb.username}`);
        console.log(`   Category: ${cb.category} | Balance: $${cb.balance}`);
        console.log('');
      });
    } else {
      console.log('No slots category balances found');
    }
    
  } catch (error) {
    console.error('❌ Error checking category balances:', error.response?.data || error.message);
  }
}

// Run the check
checkCategoryBalances(); 