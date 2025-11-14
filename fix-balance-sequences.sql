-- Fix Balance Sequence Issues
-- This script recalculates all balance_before and balance_after values correctly

-- First, let's see the current state for user 2 (the one in the provider's complaint)
SELECT 
  id,
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  external_reference,
  created_at
FROM transactions 
WHERE user_id = 2 
ORDER BY created_at;

-- Now let's fix the balance sequences
-- We'll recalculate balance_before and balance_after for all transactions
-- by processing them in chronological order

-- Step 1: Create a temporary table with the correct balance calculations
CREATE TEMP TABLE fixed_balances AS
WITH ordered_transactions AS (
  SELECT 
    id,
    user_id,
    type,
    amount,
    external_reference,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as seq_num
  FROM transactions 
  WHERE status = 'completed'
  ORDER BY user_id, created_at
),
balance_calculations AS (
  SELECT 
    t.id,
    t.user_id,
    t.type,
    t.amount,
    t.external_reference,
    t.created_at,
    t.seq_num,
    -- Calculate running balance
    SUM(
      CASE 
        WHEN t.type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN t.amount
        WHEN t.type IN ('withdrawal', 'bet') THEN -t.amount
        ELSE 0
      END
    ) OVER (PARTITION BY t.user_id ORDER BY t.created_at ROWS UNBOUNDED PRECEDING) as running_balance,
    -- Calculate balance before this transaction
    COALESCE(
      SUM(
        CASE 
          WHEN t.type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN t.amount
          WHEN t.type IN ('withdrawal', 'bet') THEN -t.amount
          ELSE 0
        END
      ) OVER (PARTITION BY t.user_id ORDER BY t.created_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
      0
    ) as balance_before_corrected,
    -- Calculate balance after this transaction
    SUM(
      CASE 
        WHEN t.type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN t.amount
        WHEN t.type IN ('withdrawal', 'bet') THEN -t.amount
        ELSE 0
      END
    ) OVER (PARTITION BY t.user_id ORDER BY t.created_at ROWS UNBOUNDED PRECEDING) as balance_after_corrected
  FROM ordered_transactions t
)
SELECT 
  id,
  user_id,
  type,
  amount,
  balance_before_corrected as balance_before,
  balance_after_corrected as balance_after,
  external_reference,
  created_at
FROM balance_calculations
ORDER BY user_id, created_at;

-- Step 2: Update the transactions table with corrected balances
UPDATE transactions 
SET 
  balance_before = fb.balance_before,
  balance_after = fb.balance_after
FROM fixed_balances fb
WHERE transactions.id = fb.id;

-- Step 3: Verify the fix
SELECT 
  'AFTER_FIX' as status,
  t.id,
  t.user_id,
  t.type,
  t.amount,
  t.balance_before,
  t.balance_after,
  CASE 
    WHEN t.type IN ('bet', 'withdrawal') THEN t.balance_before - t.amount
    WHEN t.type IN ('win', 'deposit', 'bonus', 'cashback', 'refund', 'adjustment') THEN t.balance_before + t.amount
    ELSE t.balance_after
  END as expected_balance_after,
  t.external_reference,
  t.created_at
FROM transactions t
WHERE t.user_id = 2 
  AND t.status = 'completed'
ORDER BY t.created_at;

-- Step 4: Check if there are any remaining inconsistencies
SELECT 
  'REMAINING_ISSUES' as status,
  COUNT(*) as inconsistent_transactions
FROM transactions t
WHERE t.status = 'completed'
  AND (
    (t.type IN ('bet', 'withdrawal') AND t.balance_after != t.balance_before - t.amount)
    OR 
    (t.type IN ('win', 'deposit', 'bonus', 'cashback', 'refund', 'adjustment') AND t.balance_after != t.balance_before + t.amount)
  ); 