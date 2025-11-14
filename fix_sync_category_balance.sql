-- Fix the sync_category_balance function to properly handle cancel adjustments
CREATE OR REPLACE FUNCTION public.sync_category_balance(p_user_id integer, p_category text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    category_balance NUMERIC;
    total_deposits NUMERIC;
    total_withdrawals NUMERIC;
    available_deposits NUMERIC;
    has_manual_transfers BOOLEAN;
    transfer_amount NUMERIC;
    current_stored_balance NUMERIC;
BEGIN
    -- Check if there are manual transfers for this category (exclude cancel adjustments)
    SELECT EXISTS(
        SELECT 1 FROM transactions
        WHERE user_id = p_user_id
        AND status = 'completed'
        AND LOWER(TRIM(metadata->>'category')) = LOWER(TRIM(p_category))
        AND metadata->>'transfer_type' IS NOT NULL
        AND metadata->>'transfer_type' != ''
        AND metadata->>'original_transaction' IS NULL  -- Exclude cancel adjustments
    ) INTO has_manual_transfers;

    -- If there are manual transfers, preserve the transfer amount
    IF has_manual_transfers THEN
        -- Get the current stored balance to preserve transfer amounts
        SELECT COALESCE(balance, 0) INTO current_stored_balance
        FROM user_category_balances 
        WHERE user_id = p_user_id AND LOWER(TRIM(category)) = LOWER(TRIM(p_category));
        
        -- Calculate only the non-transfer transactions (include cancel adjustments)
        SELECT COALESCE(SUM(
            CASE
                WHEN type IN ('win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount
                WHEN type IN ('bet') THEN -amount
                ELSE 0
            END
        ), 0) INTO category_balance
        FROM transactions
        WHERE user_id = p_user_id AND status = 'completed'
        AND LOWER(TRIM(metadata->>'category')) = LOWER(TRIM(p_category))
        AND (metadata->>'transfer_type' IS NULL OR metadata->>'transfer_type' = '' OR metadata->>'original_transaction' IS NOT NULL);
        
        -- Calculate the transfer amount (difference between stored balance and non-transfer transactions)
        transfer_amount := current_stored_balance - category_balance;
        
        -- Final balance = transfer amount + non-transfer transactions
        category_balance := transfer_amount + category_balance;
        
        RAISE NOTICE 'Manual transfers detected. Transfer amount: %, Non-transfer balance: %, Final balance: %', 
            transfer_amount, category_balance - transfer_amount, category_balance;
    ELSE
        -- No manual transfers - use the original logic
        SELECT COALESCE(SUM(
            CASE
                WHEN type IN ('win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount
                WHEN type IN ('bet') THEN -amount
                ELSE 0
            END
        ), 0) INTO category_balance
        FROM transactions
        WHERE user_id = p_user_id AND status = 'completed'
        AND LOWER(TRIM(metadata->>'category')) = LOWER(TRIM(p_category))
        AND (metadata->>'transfer_type' IS NULL OR metadata->>'transfer_type' = '' OR metadata->>'original_transaction' IS NOT NULL);

        -- Get total deposits and withdrawals from uncategorized transactions
        SELECT
            COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0)
        INTO total_deposits, total_withdrawals
        FROM transactions
        WHERE user_id = p_user_id AND status = 'completed'
        AND (metadata IS NULL OR metadata->>'category' IS NULL);

        available_deposits := total_deposits - total_withdrawals;

        -- Add a reasonable portion of deposits to category balance
        IF available_deposits > 0 THEN
            category_balance := category_balance + (available_deposits * 0.3);
        END IF;
    END IF;

    -- Update or insert the category balance
    INSERT INTO user_category_balances (user_id, category, balance)
    VALUES (p_user_id, p_category, category_balance)
    ON CONFLICT (user_id, category) DO UPDATE SET balance = EXCLUDED.balance;
END;
$function$; 