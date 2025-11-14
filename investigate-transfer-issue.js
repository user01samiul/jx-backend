const axios = require('axios');

// Configuration
const BASE_URL = 'https://backend.jackpotx.net';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiQWRtaW4iLCJyb2xlSWQiOjEsImlhdCI6MTc1NDQ1MzYyMSwiZXhwIjoxNzU0NTQwMDIxfQ.gAAtpvisNTEwXYD_XVnAK9GOQtFdsXJ2BLXUyO6pWWc';

async function investigateTransferIssue() {
  try {
    console.log('=== INVESTIGATING TRANSFER ISSUE FOR USER 48 ===\n');
    
    // 1. Get all transactions for user 48
    console.log('1. Getting all transactions for user 48:');
    const transactionsResponse = await axios.get(`${BASE_URL}/api/admin/transactions`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (!transactionsResponse.data.success || !transactionsResponse.data.data) {
      console.log('❌ Failed to get transactions');
      return;
    }

    const allTransactions = transactionsResponse.data.data;
    const user48Transactions = allTransactions.filter(t => t.user_id === 48);
    
    console.log(`Found ${user48Transactions.length} transactions for user 48`);
    
    // 2. Find the specific transfer transaction
    console.log('\n2. Looking for the specific transfer transaction:');
    const transferTransaction = user48Transactions.find(t => 
      t.external_reference === 'transfer_1754480086167_co5dr2cuh'
    );
    
    if (transferTransaction) {
      console.log('Found the transfer transaction:');
      console.log(`  ID: ${transferTransaction.id}`);
      console.log(`  Type: ${transferTransaction.type}`);
      console.log(`  Amount: ${transferTransaction.amount}`);
      console.log(`  Balance Before: ${transferTransaction.balance_before}`);
      console.log(`  Balance After: ${transferTransaction.balance_after}`);
      console.log(`  Description: ${transferTransaction.description}`);
      console.log(`  Metadata: ${JSON.stringify(transferTransaction.metadata)}`);
      console.log(`  Created At: ${transferTransaction.created_at}`);
      console.log(`  Status: ${transferTransaction.status}`);
      
      // Check if balance calculation is correct
      const expectedBalanceAfter = transferTransaction.balance_before + transferTransaction.amount;
      if (transferTransaction.balance_after !== expectedBalanceAfter) {
        console.log(`  ⚠️  BALANCE MISMATCH! Expected: ${expectedBalanceAfter}, Actual: ${transferTransaction.balance_after}`);
      } else {
        console.log(`  ✅ Balance calculation is correct`);
      }
    } else {
      console.log('❌ Transfer transaction not found');
    }
    
    // 3. Find all transactions with the same external reference
    console.log('\n3. All transactions with the same external reference:');
    const relatedTransactions = user48Transactions.filter(t => 
      t.external_reference === 'transfer_1754480086167_co5dr2cuh'
    );
    
    if (relatedTransactions.length > 0) {
      console.log(`Found ${relatedTransactions.length} related transactions:`);
      relatedTransactions.forEach((t, index) => {
        console.log(`  Transaction ${index + 1}:`);
        console.log(`    ID: ${t.id}`);
        console.log(`    Type: ${t.type}`);
        console.log(`    Amount: ${t.amount}`);
        console.log(`    Balance Before: ${t.balance_before}`);
        console.log(`    Balance After: ${t.balance_after}`);
        console.log(`    Description: ${t.description}`);
        console.log(`    Metadata: ${JSON.stringify(t.metadata)}`);
        console.log('');
      });
    } else {
      console.log('No related transactions found');
    }
    
    // 4. Check current balances
    console.log('4. Checking current balances:');
    const balanceResponse = await axios.get(`${BASE_URL}/api/user/balance`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (balanceResponse.data.success && balanceResponse.data.data) {
      const data = balanceResponse.data.data;
      console.log(`Main Wallet: $${data.balance || 0}`);
      console.log(`Total Balance: $${data.total_balance || 0}`);
      if (data.categories && data.categories.category_balances) {
        console.log('Category Balances:');
        data.categories.category_balances.forEach(cat => {
          console.log(`  ${cat.category}: $${cat.balance}`);
        });
      }
    }
    
    // 5. Analyze recent transactions for user 48
    console.log('\n5. Recent transactions for user 48 (last 10):');
    const recentTransactions = user48Transactions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
    
    recentTransactions.forEach((t, index) => {
      console.log(`${index + 1}. ID: ${t.id} | Type: ${t.type} | Amount: $${t.amount}`);
      console.log(`   Status: ${t.status} | Created: ${t.created_at}`);
      console.log(`   Balance Before: $${t.balance_before || 'N/A'}`);
      console.log(`   Balance After: $${t.balance_after || 'N/A'}`);
      console.log(`   Description: ${t.description || 'N/A'}`);
      console.log(`   Category: ${t.metadata?.category || 'N/A'}`);
      console.log(`   External Ref: ${t.external_reference || 'N/A'}`);
      console.log('');
    });
    
    // 6. Check for any balance inconsistencies
    console.log('6. Checking for balance inconsistencies:');
    
    // Group transactions by type and calculate totals
    const transactionTotals = {};
    user48Transactions.forEach(t => {
      if (!transactionTotals[t.type]) {
        transactionTotals[t.type] = 0;
      }
      transactionTotals[t.type] += parseFloat(t.amount);
    });
    
    console.log('Transaction totals by type:');
    Object.keys(transactionTotals).forEach(type => {
      console.log(`  ${type}: $${transactionTotals[type]}`);
    });
    
    // Check for any negative amounts in positive transaction types
    console.log('\nChecking for potential issues:');
    const negativeAmounts = user48Transactions.filter(t => 
      parseFloat(t.amount) < 0 && ['win', 'deposit', 'bonus', 'cashback', 'refund'].includes(t.type)
    );
    
    if (negativeAmounts.length > 0) {
      console.log(`⚠️  Found ${negativeAmounts.length} transactions with negative amounts in positive types:`);
      negativeAmounts.forEach(t => {
        console.log(`  ID: ${t.id} | Type: ${t.type} | Amount: ${t.amount} | Description: ${t.description}`);
      });
    } else {
      console.log('✅ No negative amounts found in positive transaction types');
    }
    
    // Check for any positive amounts in negative transaction types
    const positiveAmounts = user48Transactions.filter(t => 
      parseFloat(t.amount) > 0 && ['bet', 'withdrawal'].includes(t.type)
    );
    
    if (positiveAmounts.length > 0) {
      console.log(`⚠️  Found ${positiveAmounts.length} transactions with positive amounts in negative types:`);
      positiveAmounts.forEach(t => {
        console.log(`  ID: ${t.id} | Type: ${t.type} | Amount: ${t.amount} | Description: ${t.description}`);
      });
    } else {
      console.log('✅ No positive amounts found in negative transaction types');
    }
    
  } catch (error) {
    console.error('❌ Error investigating transfer issue:', error.response?.data || error.message);
  }
}

investigateTransferIssue().catch(console.error); 