-- Fix transaction type constraints
-- This script ensures all necessary transaction types are allowed

-- Drop the existing constraint if it exists
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add the updated constraint with all necessary types
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type::text = ANY (ARRAY[
    'deposit'::text, 
    'withdrawal'::text, 
    'bet'::text, 
    'win'::text, 
    'bonus'::text, 
    'cashback'::text, 
    'refund'::text, 
    'adjustment'::text,
    'cancellation'::text,
    'transfer'::text
]));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'transactions_type_check';

-- Check existing transaction types to ensure they're all valid
SELECT DISTINCT type, COUNT(*) as count 
FROM transactions 
GROUP BY type 
ORDER BY type;

-- Update any invalid transaction types to 'adjustment'
UPDATE transactions 
SET type = 'adjustment' 
WHERE type NOT IN ('deposit', 'withdrawal', 'bet', 'win', 'bonus', 'cashback', 'refund', 'adjustment', 'cancellation', 'transfer');

-- Verify the fix
SELECT 'Transaction types after fix:' as info;
SELECT DISTINCT type, COUNT(*) as count 
FROM transactions 
GROUP BY type 
ORDER BY type; 