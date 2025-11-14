const { Pool } = require('pg');

// Test the cancellation logic manually
async function testCancelLogic() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('=== Testing Cancel Logic ===');
    
    // Get the win transaction
    const winResult = await pool.query(
      'SELECT id, type, amount, metadata FROM transactions WHERE external_reference = $1',
      ['test_win_0.35_round1']
    );
    
    if (winResult.rows.length === 0) {
      console.log('Win transaction not found');
      return;
    }
    
    const winTransaction = winResult.rows[0];
    console.log('Win transaction:', winTransaction);
    
    // Parse metadata to get round_id
    const metadata = JSON.parse(winTransaction.metadata);
    const roundId = metadata?.round_id;
    
    console.log('Round ID:', roundId);
    
    // Find the related BET transaction for the same round
    const betResult = await pool.query(
      `SELECT amount FROM transactions 
       WHERE user_id = $1 
       AND type = 'bet' 
       AND metadata::jsonb->>'round_id' = $2 
       AND status = 'completed'
       ORDER BY id DESC LIMIT 1`,
      [50, roundId]
    );
    
    if (betResult.rows.length === 0) {
      console.log('No bet transaction found for round', roundId);
      return;
    }
    
    const betAmount = Number(betResult.rows[0].amount);
    const winAmount = Number(winTransaction.amount);
    const netEffect = -winAmount + betAmount; // Deduct win, add back bet
    
    console.log('Bet amount:', betAmount);
    console.log('Win amount:', winAmount);
    console.log('Net effect:', netEffect);
    
    // Get current balance
    const balanceResult = await pool.query(
      'SELECT balance FROM user_category_balances WHERE user_id = 50 AND category = $1',
      ['slots']
    );
    
    const currentBalance = Number(balanceResult.rows[0].balance);
    const newBalance = currentBalance + netEffect;
    
    console.log('Current balance:', currentBalance);
    console.log('New balance after cancellation:', newBalance);
    
    // Update the balance
    await pool.query(
      'UPDATE user_category_balances SET balance = $1 WHERE user_id = 50 AND category = $2',
      [newBalance, 'slots']
    );
    
    console.log('Balance updated successfully');
    
    // Mark the transaction as cancelled
    await pool.query(
      'UPDATE transactions SET status = $1 WHERE external_reference = $2',
      ['cancelled', 'test_win_0.35_round1']
    );
    
    console.log('Transaction marked as cancelled');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testCancelLogic(); 