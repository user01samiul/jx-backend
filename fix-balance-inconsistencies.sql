-- Fix Balance Inconsistencies
-- This script identifies and fixes balance calculation issues

-- 1. Check for transactions where balance_after is incorrect
SELECT 
  'INCONSISTENT_BALANCE' as issue_type,
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
WHERE t.status = 'completed'
  AND (
    (t.type IN ('bet', 'withdrawal') AND t.balance_after != t.balance_before - t.amount)
    OR 
    (t.type IN ('win', 'deposit', 'bonus', 'cashback', 'refund', 'adjustment') AND t.balance_after != t.balance_before + t.amount)
  )
ORDER BY t.user_id, t.created_at;

-- 2. Check for transactions where balance_before doesn't match previous balance_after
WITH transaction_sequence AS (
  SELECT 
    t.*,
    LAG(t.balance_after) OVER (PARTITION BY t.user_id ORDER BY t.created_at) as previous_balance_after
  FROM transactions t
  WHERE t.status = 'completed'
)
SELECT 
  'SEQUENCE_MISMATCH' as issue_type,
  t.id,
  t.user_id,
  t.type,
  t.amount,
  t.balance_before,
  t.previous_balance_after,
  t.balance_after,
  t.external_reference,
  t.created_at
FROM transaction_sequence t
WHERE t.balance_before != COALESCE(t.previous_balance_after, 0)
  AND t.created_at > (SELECT MIN(created_at) FROM transactions WHERE user_id = t.user_id)
ORDER BY t.user_id, t.created_at;

-- 3. Check for negative balances (should not happen)
SELECT 
  'NEGATIVE_BALANCE' as issue_type,
  t.id,
  t.user_id,
  t.type,
  t.amount,
  t.balance_before,
  t.balance_after,
  t.external_reference,
  t.created_at
FROM transactions t
WHERE t.status = 'completed' AND t.balance_after < 0
ORDER BY t.user_id, t.created_at;

-- 4. Summary of issues by user
SELECT 
  user_id,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN type IN ('bet', 'withdrawal') AND balance_after != balance_before - amount THEN 1 END) as incorrect_bets,
  COUNT(CASE WHEN type IN ('win', 'deposit', 'bonus', 'cashback', 'refund', 'adjustment') AND balance_after != balance_before + amount THEN 1 END) as incorrect_credits,
  COUNT(CASE WHEN balance_after < 0 THEN 1 END) as negative_balances
FROM transactions 
WHERE status = 'completed'
GROUP BY user_id
HAVING COUNT(CASE WHEN type IN ('bet', 'withdrawal') AND balance_after != balance_before - amount THEN 1 END) > 0
   OR COUNT(CASE WHEN type IN ('win', 'deposit', 'bonus', 'cashback', 'refund', 'adjustment') AND balance_after != balance_before + amount THEN 1 END) > 0
   OR COUNT(CASE WHEN balance_after < 0 THEN 1 END) > 0
ORDER BY total_transactions DESC; 