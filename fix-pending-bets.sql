-- Fix stuck pending bets
BEGIN;

-- First, let's see what we're dealing with
SELECT 'Current pending bets count:' as info, COUNT(*) as count FROM bets WHERE outcome = 'pending';

-- Cancel all pending bets
UPDATE bets 
SET outcome = 'cancelled' 
WHERE outcome = 'pending';

-- Verify the fix
SELECT 'Remaining pending bets:' as info, COUNT(*) as count FROM bets WHERE outcome = 'pending';

-- Show summary of what was cancelled
SELECT 
    user_id,
    COUNT(*) as bets_cancelled,
    SUM(bet_amount) as total_amount
FROM bets 
WHERE outcome = 'cancelled' 
AND placed_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
ORDER BY user_id;

COMMIT; 