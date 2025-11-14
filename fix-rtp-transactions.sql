-- Fix RTP Transactions Script
-- This script corrects transactions that were affected by the old buggy RTP logic
-- where effective_rtp = 100% but adjustments were still applied

BEGIN;

-- Create a temporary table to store the corrections
CREATE TEMP TABLE rtp_fixes AS
SELECT 
    t.id as transaction_id,
    t.user_id,
    t.balance_before,
    t.amount as current_amount,
    pt.original_amount as correct_amount,
    (t.balance_before + pt.original_amount) as correct_balance_after,
    pt.profit_reduction,
    t.created_at
FROM transactions t 
JOIN profit_tracking pt ON t.user_id = pt.user_id 
    AND t.created_at BETWEEN pt.created_at - INTERVAL '1 second' AND pt.created_at + INTERVAL '1 second'
WHERE pt.effective_rtp = 100.00 
    AND pt.profit_reduction < 0 
    AND t.type = 'win'
ORDER BY t.created_at DESC;

-- Show what will be fixed
SELECT 
    transaction_id,
    user_id,
    current_amount,
    correct_amount,
    correct_balance_after,
    profit_reduction,
    created_at
FROM rtp_fixes;

-- Update transactions with correct amounts and balances
UPDATE transactions 
SET 
    amount = rf.correct_amount,
    balance_after = rf.correct_balance_after
FROM rtp_fixes rf 
WHERE transactions.id = rf.transaction_id;

-- Update profit_tracking to show no adjustment
UPDATE profit_tracking 
SET 
    adjusted_amount = original_amount,
    profit_reduction = 0.00
WHERE effective_rtp = 100.00 
    AND profit_reduction < 0;

-- Show the corrected transactions
SELECT 
    t.id,
    t.type,
    t.amount,
    t.balance_before,
    t.balance_after,
    t.created_at,
    t.external_reference
FROM transactions t
JOIN rtp_fixes rf ON t.id = rf.transaction_id
ORDER BY t.created_at DESC;

COMMIT; 