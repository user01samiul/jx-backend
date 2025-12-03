-- Migration: Clean up duplicate usernames and emails before adding unique indexes
-- Description: Removes duplicate users (keeping the oldest account for each duplicate)
-- Date: 2025-12-02
-- IMPORTANT: Review duplicates before running this migration in production

-- =====================================================
-- 1. BACKUP: Show all duplicates that will be affected
-- =====================================================

-- Show duplicate usernames
SELECT
    '=== DUPLICATE USERNAMES ===' as section,
    LOWER(username) as username_lower,
    COUNT(*) as count,
    STRING_AGG(CONCAT('ID:', id, ' | Username:', username, ' | Email:', email, ' | Created:', created_at), E'\n' ORDER BY id) as user_details
FROM users
GROUP BY LOWER(username)
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Show duplicate emails
SELECT
    '=== DUPLICATE EMAILS ===' as section,
    LOWER(email) as email_lower,
    COUNT(*) as count,
    STRING_AGG(CONCAT('ID:', id, ' | Username:', username, ' | Email:', email, ' | Created:', created_at), E'\n' ORDER BY id) as user_details
FROM users
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- =====================================================
-- 2. CREATE TEMPORARY TABLE: Users to keep vs delete
-- =====================================================

-- Create temporary table to store IDs of duplicate users that should be deleted
CREATE TEMP TABLE duplicate_users_to_delete AS
WITH duplicate_usernames AS (
    SELECT
        id,
        LOWER(username) as username_lower,
        LOWER(email) as email_lower,
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
SELECT DISTINCT u.id, u.username, u.email, u.created_at
FROM users u
LEFT JOIN duplicate_usernames du ON u.id = du.id
LEFT JOIN duplicate_emails de ON u.id = de.id
WHERE
    (du.rn_username > 1 OR de.rn_email > 1)
ORDER BY u.id;

-- Show users that will be deleted
SELECT
    '=== USERS TO BE DELETED (NEWER DUPLICATES) ===' as section,
    COUNT(*) as total_to_delete;

SELECT * FROM duplicate_users_to_delete ORDER BY id;

-- =====================================================
-- 3. SAFETY CHECK: Ask for confirmation
-- =====================================================

-- Show summary of what will happen
SELECT
    '=== MIGRATION SUMMARY ===' as section,
    (SELECT COUNT(*) FROM users) as total_users_before,
    (SELECT COUNT(*) FROM duplicate_users_to_delete) as users_to_delete,
    (SELECT COUNT(*) FROM users) - (SELECT COUNT(*) FROM duplicate_users_to_delete) as total_users_after;

-- =====================================================
-- 4. CLEANUP STRATEGY (MANUAL REVIEW REQUIRED)
-- =====================================================

-- OPTION A: Delete newer duplicate users (recommended for test/dev environments)
-- This keeps the oldest account (lowest ID) for each duplicate username/email
--
-- Uncomment the following block to execute deletion:

/*
BEGIN;

-- Delete related records first (to avoid foreign key constraint violations)
DELETE FROM user_roles WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_balances WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_level_progress WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_game_preferences WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM user_activity_logs WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);
DELETE FROM tokens WHERE user_id IN (SELECT id FROM duplicate_users_to_delete);

-- Add more related tables as needed based on your foreign key constraints

-- Finally, delete the duplicate users
DELETE FROM users WHERE id IN (SELECT id FROM duplicate_users_to_delete);

-- Show result
SELECT
    '=== CLEANUP COMPLETE ===' as section,
    COUNT(*) as remaining_users
FROM users;

COMMIT;
*/

-- OPTION B: Manual review and selective deletion
-- Review the duplicate_users_to_delete table and manually decide which users to keep/delete

-- =====================================================
-- 5. AFTER CLEANUP: Create unique indexes
-- =====================================================

-- After duplicates are removed, run the index migration:
-- \i migration-username-email-indexes.sql

-- =====================================================
-- Production Safety Notes:
-- =====================================================
--
-- Before running this in production:
-- 1. Take a full database backup
-- 2. Review all duplicates manually
-- 3. Check if any duplicate users have important data (transactions, balances, etc.)
-- 4. Consider merging data instead of deleting
-- 5. Test on a staging environment first
-- 6. Run during low-traffic hours
-- 7. Have a rollback plan ready
--
-- For this specific database, duplicates found:
-- - admin (3 duplicates)
-- - arsalan@gmail.com (2 duplicates)
-- - bocaixela (2 duplicates)
-- - demo_afr (2 duplicates)
-- - dev01 (2 duplicates)
-- - samiul (2 duplicates)
--
-- These appear to be test accounts, but verify before deletion!
-- =====================================================
