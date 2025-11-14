-- Fix the calculate_user_balance function to exclude category transactions
CREATE OR REPLACE FUNCTION public.calculate_user_balance(p_user_id integer)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
DECLARE
    net_balance NUMERIC := 0;
    locked_amount NUMERIC := 0;
BEGIN
    -- Calculate net balance from main wallet transactions only (exclude category transactions)
    SELECT COALESCE(SUM(
        CASE 
            WHEN type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount
            WHEN type IN ('withdrawal', 'bet') THEN -amount
            ELSE 0
        END
    ), 0) INTO net_balance
    FROM transactions 
    WHERE user_id = p_user_id AND status = 'completed' 
    AND (metadata->>'category' IS NULL OR metadata->>'category' = '');
    
    -- Calculate locked amount from pending bets
    SELECT COALESCE(SUM(bet_amount), 0) INTO locked_amount
    FROM bets 
    WHERE user_id = p_user_id AND outcome = 'pending';
    
    -- Return available balance (net balance minus locked amount)
    RETURN GREATEST(0, net_balance - locked_amount);
END;
$function$; 