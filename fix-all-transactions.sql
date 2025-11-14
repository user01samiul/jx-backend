-- Fix All Transactions Script
-- This script recalculates all transactions after the RTP fix

BEGIN;

-- First, let's see what transactions need to be recalculated
SELECT 
    id,
    type,
    amount,
    balance_before,
    balance_after,
    created_at,
    external_reference
FROM transactions 
WHERE user_id = 1 
    AND created_at > '2025-08-02 11:41:39'
ORDER BY created_at ASC;

-- Update the balance_before for the first transaction after the fix
UPDATE transactions 
SET balance_before = 127.42
WHERE id = 1115; -- The bet transaction after the corrected win

-- Recalculate all subsequent transactions
UPDATE transactions 
SET 
    balance_before = (
        SELECT COALESCE(MAX(balance_after), 127.42)
        FROM transactions t2 
        WHERE t2.user_id = transactions.user_id 
            AND t2.created_at < transactions.created_at
    ),
    balance_after = (
        SELECT COALESCE(MAX(balance_after), 127.42)
        FROM transactions t2 
        WHERE t2.user_id = transactions.user_id 
            AND t2.created_at < transactions.created_at
    ) + CASE 
        WHEN transactions.type = 'bet' THEN -transactions.amount
        WHEN transactions.type = 'win' THEN transactions.amount
        ELSE 0
    END
WHERE user_id = 1 
    AND created_at > '2025-08-02 11:41:39';

-- Show the corrected transactions
SELECT 
    id,
    type,
    amount,
    balance_before,
    balance_after,
    created_at,
    external_reference
FROM transactions 
WHERE user_id = 1 
    AND created_at > '2025-08-02 11:41:39'
ORDER BY created_at ASC;

COMMIT; 