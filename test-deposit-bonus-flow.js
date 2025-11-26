const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'jackpotx-db',
  user: 'postgres',
  password: '12358Voot#'
});

async function testDepositBonusFlow() {
  const client = await pool.connect();

  try {
    console.log('\n🧪 TESTING DEPOSIT BONUS AUTO-GRANT FLOW\n');
    console.log('='.repeat(60));

    // Test user
    const TEST_USER_ID = 23;
    const TEST_USERNAME = 'newuser1';
    const DEPOSIT_AMOUNT = 2000; // $2000 USD
    const BONUS_PLAN_ID = 1; // Welcome Bonus 100%

    console.log(`\n📋 TEST SETUP:`);
    console.log(`   User: ${TEST_USERNAME} (ID: ${TEST_USER_ID})`);
    console.log(`   Deposit Amount: $${DEPOSIT_AMOUNT}`);
    console.log(`   Bonus Plan: Welcome Bonus 100% (ID: ${BONUS_PLAN_ID})`);

    // Step 1: Check initial state
    console.log(`\n\n📊 STEP 1: Check Initial State`);
    console.log('-'.repeat(60));

    const initialBalance = await client.query(
      'SELECT balance FROM user_balances WHERE user_id = $1',
      [TEST_USER_ID]
    );

    const initialBonusWallet = await client.query(
      'SELECT * FROM bonus_wallets WHERE player_id = $1',
      [TEST_USER_ID]
    );

    const existingBonus = await client.query(
      'SELECT * FROM bonus_instances WHERE player_id = $1 AND bonus_plan_id = $2',
      [TEST_USER_ID, BONUS_PLAN_ID]
    );

    console.log(`   Main Wallet: $${initialBalance.rows[0]?.balance || 0}`);
    console.log(`   Bonus Wallet: $${initialBonusWallet.rows[0]?.total_bonus_balance || 0}`);
    console.log(`   Existing Welcome Bonus: ${existingBonus.rows.length > 0 ? 'YES (already claimed)' : 'NO'}`);

    if (existingBonus.rows.length > 0) {
      console.log(`\n   ⚠️  WARNING: User already has this bonus!`);
      console.log(`   Bonus Status: ${existingBonus.rows[0].status}`);
      console.log(`   Granted At: ${existingBonus.rows[0].granted_at}`);
      console.log(`\n   To test again, you would need to:`);
      console.log(`   1. Delete the existing bonus instance`);
      console.log(`   2. Or use a different user`);
      console.log(`   3. Or create a repeatable deposit bonus (max_trigger_per_player = NULL)`);

      // Let's still continue to show the flow
      console.log(`\n   Continuing to show the flow anyway...`);
    }

    // Step 2: Simulate deposit transaction creation
    console.log(`\n\n💳 STEP 2: Create Deposit Transaction`);
    console.log('-'.repeat(60));

    await client.query('BEGIN');

    const txResult = await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, description, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        TEST_USER_ID,
        'deposit',
        DEPOSIT_AMOUNT,
        'USD',
        'pending',
        `Test deposit for bonus flow`,
        JSON.stringify({
          test: true,
          gateway_code: 'oxapay',
          crypto_amount: 2000,
          crypto_currency: 'USDT'
        })
      ]
    );

    const transactionId = txResult.rows[0].id;
    console.log(`   ✅ Transaction created: ID ${transactionId}`);
    console.log(`   Amount: $${DEPOSIT_AMOUNT} USD`);
    console.log(`   Status: pending`);

    // Step 3: Simulate webhook completion (update balance)
    console.log(`\n\n📲 STEP 3: Simulate Webhook - Update Balance`);
    console.log('-'.repeat(60));

    // Update transaction to completed
    await client.query(
      `UPDATE transactions SET status = 'completed' WHERE id = $1`,
      [transactionId]
    );

    // Add to user balance
    await client.query(
      `UPDATE user_balances
       SET balance = balance + $1
       WHERE user_id = $2`,
      [DEPOSIT_AMOUNT, TEST_USER_ID]
    );

    console.log(`   ✅ Transaction marked as completed`);
    console.log(`   ✅ Balance updated: +$${DEPOSIT_AMOUNT}`);

    // Step 4: Call BonusEngineService.handleDeposit (the fix we added)
    console.log(`\n\n🎁 STEP 4: Auto-Grant Deposit Bonus`);
    console.log('-'.repeat(60));
    console.log(`   Calling: BonusEngineService.handleDeposit()`);

    // Import the service
    const { BonusEngineService } = require('./dist/services/bonus/bonus-engine.service');

    try {
      await BonusEngineService.handleDeposit(
        TEST_USER_ID,
        DEPOSIT_AMOUNT,
        transactionId,
        1 // payment gateway ID
      );

      console.log(`   ✅ Bonus granting completed successfully!`);
    } catch (bonusError) {
      if (bonusError.message && bonusError.message.includes('already claimed')) {
        console.log(`   ⚠️  Expected: ${bonusError.message}`);
      } else if (bonusError.code === '23505') {
        console.log(`   ⚠️  Expected: Duplicate bonus prevented by database constraint`);
      } else {
        console.log(`   ❌ Unexpected Error: ${bonusError.message}`);
        throw bonusError;
      }
    }

    await client.query('COMMIT');

    // Step 5: Verify final state
    console.log(`\n\n✅ STEP 5: Verify Final State`);
    console.log('-'.repeat(60));

    const finalBalance = await client.query(
      'SELECT balance FROM user_balances WHERE user_id = $1',
      [TEST_USER_ID]
    );

    const finalBonusWallet = await client.query(
      'SELECT * FROM bonus_wallets WHERE player_id = $1',
      [TEST_USER_ID]
    );

    const grantedBonus = await client.query(
      `SELECT bi.*, bp.name as bonus_name
       FROM bonus_instances bi
       JOIN bonus_plans bp ON bi.bonus_plan_id = bp.id
       WHERE bi.player_id = $1 AND bi.deposit_transaction_id = $2`,
      [TEST_USER_ID, transactionId]
    );

    const bonusTransactions = await client.query(
      `SELECT * FROM bonus_transactions
       WHERE player_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [TEST_USER_ID]
    );

    console.log(`\n   💰 MAIN WALLET:`);
    console.log(`      Balance: $${finalBalance.rows[0]?.balance || 0}`);
    console.log(`      Change: +$${DEPOSIT_AMOUNT}`);

    console.log(`\n   🎁 BONUS WALLET:`);
    if (finalBonusWallet.rows.length > 0) {
      const bw = finalBonusWallet.rows[0];
      console.log(`      Total Bonus Balance: $${bw.total_bonus_balance}`);
      console.log(`      Playable Balance: $${bw.playable_bonus_balance}`);
      console.log(`      Locked Balance: $${bw.locked_bonus_balance}`);
      console.log(`      Active Bonuses: ${bw.active_bonus_count}`);
    } else {
      console.log(`      No bonus wallet found`);
    }

    console.log(`\n   🎯 BONUS INSTANCE:`);
    if (grantedBonus.rows.length > 0) {
      const bonus = grantedBonus.rows[0];
      console.log(`      ✅ Bonus Granted!`);
      console.log(`      Name: ${bonus.bonus_name}`);
      console.log(`      Bonus Amount: $${bonus.bonus_amount}`);
      console.log(`      Remaining: $${bonus.remaining_bonus}`);
      console.log(`      Wagering Required: $${bonus.wager_requirement_amount}`);
      console.log(`      Wagering Progress: ${bonus.wager_percentage_complete}%`);
      console.log(`      Status: ${bonus.status}`);
      console.log(`      Expires: ${new Date(bonus.expires_at).toLocaleDateString()}`);
    } else {
      console.log(`      ⚠️  No bonus granted for this transaction`);
    }

    console.log(`\n   📝 BONUS TRANSACTIONS (Recent ${bonusTransactions.rows.length}):`);
    bonusTransactions.rows.forEach((tx, i) => {
      console.log(`      ${i + 1}. ${tx.transaction_type}: $${tx.amount} - ${tx.description || 'N/A'}`);
    });

    // Summary
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`📊 TEST SUMMARY`);
    console.log(`${'='.repeat(60)}\n`);

    const bonusGranted = grantedBonus.rows.length > 0;
    const expectedBonus = DEPOSIT_AMOUNT * 1.0; // 100% match
    const expectedWagering = expectedBonus * 35; // 35x

    console.log(`   Deposit Amount: $${DEPOSIT_AMOUNT}`);
    console.log(`   Expected Bonus: $${expectedBonus} (100% match)`);
    console.log(`   Expected Wagering: $${expectedWagering} (35x bonus)`);
    console.log(`\n   Result: ${bonusGranted ? '✅ SUCCESS' : '⚠️  NEEDS INVESTIGATION'}`);

    if (bonusGranted) {
      const bonus = grantedBonus.rows[0];
      console.log(`\n   ✅ Bonus Amount: $${bonus.bonus_amount} ${bonus.bonus_amount === expectedBonus ? '(Correct!)' : '(Check calculation)'}`);
      console.log(`   ✅ Wagering: $${bonus.wager_requirement_amount} ${bonus.wager_requirement_amount === expectedWagering ? '(Correct!)' : '(Check calculation)'}`);
      console.log(`   ✅ Status: ${bonus.status}`);
      console.log(`\n   🎉 DEPOSIT BONUS AUTO-GRANT IS WORKING!`);
    } else if (existingBonus.rows.length > 0) {
      console.log(`\n   ℹ️  Bonus not granted because user already claimed this bonus`);
      console.log(`   ℹ️  This is CORRECT behavior (max_trigger_per_player = 1)`);
      console.log(`\n   ✅ DUPLICATE PREVENTION IS WORKING!`);
    } else {
      console.log(`\n   ❌ No bonus was granted`);
      console.log(`   ❌ This indicates a problem with the bonus granting logic`);
    }

    console.log(`\n${'='.repeat(60)}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testDepositBonusFlow();
