-- Fix Category Balances Script
-- This script recalculates category balances based on the corrected transactions

BEGIN;

-- Calculate the total adjustment needed for each user's slots category
WITH balance_adjustments AS (
    SELECT 
        user_id,
        SUM(original_amount - current_amount) as total_adjustment
    FROM (
        SELECT 
            t.user_id,
            pt.original_amount,
            t.amount as current_amount
        FROM transactions t 
        JOIN profit_tracking pt ON t.user_id = pt.user_id 
            AND t.created_at BETWEEN pt.created_at - INTERVAL '1 second' AND pt.created_at + INTERVAL '1 second'
        WHERE pt.effective_rtp = 100.00 
            AND pt.profit_reduction < 0 
            AND t.type = 'win'
    ) adjustments
    GROUP BY user_id
)
-- Update category balances
UPDATE user_category_balances 
SET balance = balance + ba.total_adjustment
FROM balance_adjustments ba
WHERE user_category_balances.user_id = ba.user_id 
    AND user_category_balances.category = 'slots';

-- Show the corrected balances
SELECT 
    user_id,
    category,
    balance
FROM user_category_balances 
WHERE user_id IN (1, 2) 
ORDER BY user_id, category;

COMMIT; 