-- Migration: Ensure all users have profile records with default currency
-- This fixes the "column u.currency does not exist" error

-- Insert user profiles for users who don't have them
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

-- Insert user balances for users who don't have them
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

-- Update existing user profiles to ensure currency is set
UPDATE user_profiles 
SET currency = 'USD' 
WHERE currency IS NULL OR currency = '';

-- Commit the changes
COMMIT; 