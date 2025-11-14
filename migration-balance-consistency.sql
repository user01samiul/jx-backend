-- Migration: Ensure balance consistency and real-time calculation
-- This migration ensures all users have proper balance records and transactions

BEGIN;

-- 1. Ensure all users have user_balances records
INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
SELECT 
    u.id as user_id,
    0 as balance,
    0 as bonus_balance,
    0 as locked_balance,
    0 as total_deposited,
    0 as total_withdrawn,
    0 as total_wagered,
    0 as total_won,
    CURRENT_TIMESTAMP as updated_at
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE ub.user_id IS NULL;

-- 2. Ensure all users have user_profiles with currency
INSERT INTO user_profiles (user_id, currency, language, timezone, created_at, updated_at)
SELECT 
    u.id as user_id,
    'USD' as currency,
    'en' as language,
    'UTC' as timezone,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- 3. Update existing user_profiles to ensure currency is set
UPDATE user_profiles 
SET currency = 'USD' 
WHERE currency IS NULL OR currency = '';

-- 4. Create initial deposit transactions for users who don't have any transactions
-- This ensures the balance calculation works correctly
INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, currency, status, description, created_at, created_by)
SELECT 
    u.id as user_id,
    'adjustment' as type,
    0 as amount,
    0 as balance_before,
    0 as balance_after,
    COALESCE(up.currency, 'USD') as currency,
    'completed' as status,
    'Initial balance setup' as description,
    CURRENT_TIMESTAMP as created_at,
    1 as created_by
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM transactions t WHERE t.user_id = u.id
);

-- 5. Add index for better balance calculation performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_status ON transactions(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_bets_user_outcome ON bets(user_id, outcome);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- 6. Create a function to calculate real-time balance
CREATE OR REPLACE FUNCTION calculate_user_balance(p_user_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    net_balance NUMERIC := 0;
    locked_amount NUMERIC := 0;
BEGIN
    -- Calculate net balance from transactions
    SELECT COALESCE(SUM(
        CASE 
            WHEN type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount
            WHEN type IN ('withdrawal', 'bet') THEN -amount
            ELSE 0
        END
    ), 0) INTO net_balance
    FROM transactions 
    WHERE user_id = p_user_id AND status = 'completed';
    
    -- Calculate locked amount from pending bets
    SELECT COALESCE(SUM(bet_amount), 0) INTO locked_amount
    FROM bets 
    WHERE user_id = p_user_id AND outcome = 'pending';
    
    -- Return available balance (net balance minus locked amount)
    RETURN GREATEST(0, net_balance - locked_amount);
END;
$$ LANGUAGE plpgsql;

-- 7. Create a function to sync stored balance with real-time calculation
CREATE OR REPLACE FUNCTION sync_user_balance(p_user_id INTEGER)
RETURNS VOID AS $$
DECLARE
    real_time_balance NUMERIC;
    bonus_balance NUMERIC;
    total_deposited NUMERIC;
    total_withdrawn NUMERIC;
    total_wagered NUMERIC;
    total_won NUMERIC;
    user_currency VARCHAR(3);
BEGIN
    -- Get real-time balance
    SELECT calculate_user_balance(p_user_id) INTO real_time_balance;
    
    -- Get bonus balance from stored record
    SELECT COALESCE(ub.bonus_balance, 0) INTO bonus_balance
    FROM user_balances ub WHERE ub.user_id = p_user_id;
    
    -- Calculate totals from transactions
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0)
    INTO total_deposited, total_withdrawn, total_wagered, total_won
    FROM transactions 
    WHERE user_id = p_user_id AND status = 'completed';
    
    -- Get user currency
    SELECT COALESCE(currency, 'USD') INTO user_currency
    FROM user_profiles WHERE user_id = p_user_id;
    
    -- Update stored balance
    INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
    VALUES (p_user_id, real_time_balance, bonus_balance, 0, total_deposited, total_withdrawn, total_wagered, total_won, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
        balance = EXCLUDED.balance,
        total_deposited = EXCLUDED.total_deposited,
        total_withdrawn = EXCLUDED.total_withdrawn,
        total_wagered = EXCLUDED.total_wagered,
        total_won = EXCLUDED.total_won,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 8. Create a trigger to automatically sync balance when transactions change
CREATE OR REPLACE FUNCTION trigger_sync_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync balance for the affected user
    PERFORM sync_user_balance(COALESCE(NEW.user_id, OLD.user_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS sync_balance_on_transaction ON transactions;
CREATE TRIGGER sync_balance_on_transaction
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_balance();

-- Create trigger on bets table
DROP TRIGGER IF EXISTS sync_balance_on_bet ON bets;
CREATE TRIGGER sync_balance_on_bet
    AFTER INSERT OR UPDATE OR DELETE ON bets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_balance();

-- 9. Initial sync of all user balances
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM users LOOP
        PERFORM sync_user_balance(user_record.id);
    END LOOP;
END $$;

COMMIT;

-- 10. Verify the migration
SELECT 
    'Migration completed successfully. Total users: ' || COUNT(*) as status
FROM users;

SELECT 
    'Users with balance records: ' || COUNT(*) as status
FROM user_balances;

SELECT 
    'Users with profile records: ' || COUNT(*) as status
FROM user_profiles; 