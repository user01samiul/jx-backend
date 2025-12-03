-- Migration: Execute duplicate cleanup and create unique indexes
-- Description: Removes duplicate users and adds performance indexes
-- Date: 2025-12-02
-- Safe for execution: Only removes newer duplicates (keeps oldest accounts)

BEGIN;

-- =====================================================
-- STEP 1: Delete newer duplicate users
-- =====================================================

-- Create temporary table with users to delete
CREATE TEMP TABLE duplicate_users_to_delete AS
WITH duplicate_usernames AS (
    SELECT
        id,
        LOWER(username) as username_lower,
        ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY id ASC) as rn_username
    FROM users
),
duplicate_emails AS (
    SELECT
        id,
        LOWER(email) as email_lower,
        ROW_NUMBER() OVER (PARTITION BY LOWER(email) ORDER BY id ASC) as rn_email
    FROM users
)
SELECT DISTINCT u.id
FROM users u
LEFT JOIN duplicate_usernames du ON u.id = du.id
LEFT JOIN duplicate_emails de ON u.id = de.id
WHERE (du.rn_username > 1 OR de.rn_email > 1);

-- Show how many users will be deleted
SELECT
    '=== CLEANUP STARTING ===' as status,
    COUNT(*) as users_to_delete
FROM duplicate_users_to_delete;

-- Delete related records first (cascade cleanup)
DELETE FROM user_roles WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_balances WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_level_progress WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_game_preferences WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_activity_logs WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM tokens WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM affiliate_applications WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM affiliate_balance_transactions WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM affiliate_clicks WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM affiliate_commissions WHERE affiliate_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM affiliate_commissions WHERE referred_user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM affiliate_links WHERE affiliate_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM affiliate_payouts WHERE affiliate_id IN (SELECT id FROM duplicate_users_to_delete);

-- Finally, delete the duplicate users themselves
DELETE FROM users WHERE id IN (SELECT id FROM duplicate_users_to_delete);

-- Show cleanup result
SELECT
    '=== CLEANUP COMPLETE ===' as status,
    COUNT(*) as remaining_users
FROM users;

-- =====================================================
-- STEP 2: Create unique indexes on username and email
-- =====================================================

-- Drop any existing indexes (idempotent)
DROP INDEX IF EXISTS idx_users_username_lower;
DROP INDEX IF EXISTS idx_users_email_lower;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_email;

-- Create unique indexes on lowercase versions (enforces case-insensitive uniqueness)
CREATE UNIQUE INDEX idx_users_username_lower ON users(LOWER(username));
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));

-- Create regular indexes for exact match performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Show created indexes
SELECT
    '=== INDEXES CREATED ===' as status,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND (indexname LIKE '%username%' OR indexname LIKE '%email%')
ORDER BY indexname;

-- =====================================================
-- STEP 3: Verify uniqueness constraint
-- =====================================================

-- Count any remaining duplicates (should be 0)
SELECT
    '=== VERIFICATION ===' as status,
    'Username duplicates' as check_type,
    COUNT(*) as duplicates_found
FROM (
    SELECT LOWER(username), COUNT(*) as cnt
    FROM users
    GROUP BY LOWER(username)
    HAVING COUNT(*) > 1
) dup

UNION ALL

SELECT
    '=== VERIFICATION ===' as status,
    'Email duplicates' as check_type,
    COUNT(*) as duplicates_found
FROM (
    SELECT LOWER(email), COUNT(*) as cnt
    FROM users
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
) dup;

-- =====================================================
-- STEP 4: Show final statistics
-- =====================================================

SELECT
    '=== FINAL STATISTICS ===' as section,
    pg_size_pretty(pg_total_relation_size('users')) AS total_size,
    pg_size_pretty(pg_relation_size('users')) AS table_size,
    pg_size_pretty(pg_total_relation_size('users') - pg_relation_size('users')) AS indexes_size,
    (SELECT COUNT(*) FROM users) as total_users;

-- Commit all changes
COMMIT;

-- Success message
SELECT '✅ Migration completed successfully!' as result;
SELECT '✅ Duplicate users removed' as step_1;
SELECT '✅ Unique indexes created on username and email' as step_2;
SELECT '✅ Case-insensitive uniqueness enforced at database level' as step_3;
SELECT '⚡ Username/email lookups are now much faster' as benefit_1;
SELECT '🔒 Duplicate usernames/emails can no longer be created' as benefit_2;
