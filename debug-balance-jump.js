const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';

// Debug Balance Jump Issue
async function debugBalanceJump() {
  try {
    console.log('🔍 **DEBUGGING BALANCE JUMP ISSUE**');
    console.log('===================================');
    
    // Get all transactions to see if there's a pattern
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc'
      }
    });

    if (!transactionsResponse.data.success || !transactionsResponse.data.data) {
      console.log('❌ Failed to get transactions');
      return;
    }

    const transactions = transactionsResponse.data.data;
    
    // Find all transactions with balance_before around 1500
    const suspiciousTransactions = transactions.filter(t => 
      t.balance_before && 
      (t.balance_before >= 1500 && t.balance_before <= 1501)
    );
    
    console.log(`🔍 **SUSPICIOUS TRANSACTIONS (Balance Before ~1500)**`);
    console.log(`Found ${suspiciousTransactions.length} transactions with balance_before around 1500`);
    
    if (suspiciousTransactions.length > 0) {
      suspiciousTransactions.forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | User ID: ${t.user_id} | Type: ${t.type}`);
        console.log(`   Amount: $${t.amount} | Balance Before: $${t.balance_before} | Balance After: $${t.balance_after}`);
        console.log(`   Description: ${t.description || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log(`   Created: ${t.created_at}`);
        console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check for any transactions that might have set the balance to 1500
    const balanceSettingTransactions = transactions.filter(t => 
      t.balance_after && 
      (t.balance_after >= 1500 && t.balance_after <= 1501) &&
      t.balance_before && 
      t.balance_before < 1500
    );
    
    console.log(`🔍 **BALANCE SETTING TRANSACTIONS (Jump to ~1500)**`);
    console.log(`Found ${balanceSettingTransactions.length} transactions that set balance to around 1500`);
    
    if (balanceSettingTransactions.length > 0) {
      balanceSettingTransactions.forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | User ID: ${t.user_id} | Type: ${t.type}`);
        console.log(`   Amount: $${t.amount} | Balance Before: $${t.balance_before} | Balance After: $${t.balance_after}`);
        console.log(`   Description: ${t.description || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log(`   Created: ${t.created_at}`);
        console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check for any transactions around the time of the bug (between 10:38 and 10:41)
    const timeRangeTransactions = transactions.filter(t => {
      const createdAt = new Date(t.created_at);
      const startTime = new Date('2025-08-06T10:38:00.000Z');
      const endTime = new Date('2025-08-06T10:42:00.000Z');
      return createdAt >= startTime && createdAt <= endTime;
    });
    
    console.log(`🔍 **TRANSACTIONS IN TIME RANGE (10:38-10:42)**`);
    console.log(`Found ${timeRangeTransactions.length} transactions in the time range`);
    
    if (timeRangeTransactions.length > 0) {
      timeRangeTransactions.forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | User ID: ${t.user_id} | Type: ${t.type}`);
        console.log(`   Amount: $${t.amount} | Balance Before: $${t.balance_before || 'N/A'} | Balance After: $${t.balance_after || 'N/A'}`);
        console.log(`   Description: ${t.description || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log(`   Created: ${t.created_at}`);
        console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check if there are any other users with similar balance patterns
    const allUsersWith1500Balance = transactions.filter(t => 
      t.balance_before && 
      (t.balance_before >= 1499 && t.balance_before <= 1501)
    ).map(t => t.user_id);
    
    const uniqueUsers = [...new Set(allUsersWith1500Balance)];
    
    console.log(`🔍 **USERS WITH BALANCE AROUND 1500**`);
    console.log(`Found ${uniqueUsers.length} unique users with balance around 1500: ${uniqueUsers.join(', ')}`);
    
    // Check if there's a pattern with user 31 (who also has 1500 balance)
    if (uniqueUsers.includes(31)) {
      console.log(`\n🔍 **USER 31 TRANSACTIONS (FOR COMPARISON)**`);
      const user31Transactions = transactions.filter(t => t.user_id === 31);
      
      user31Transactions.slice(0, 10).forEach((t, index) => {
        console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
        console.log(`   Balance Before: $${t.balance_before || 'N/A'} | Balance After: $${t.balance_after || 'N/A'}`);
        console.log(`   Description: ${t.description || 'N/A'}`);
        console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
        console.log(`   Created: ${t.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging balance jump:', error.response?.data || error.message);
  }
}

// Run the debug
debugBalanceJump(); 