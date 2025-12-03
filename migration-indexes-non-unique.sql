-- Migration: Add performance indexes for username and email (non-unique version)
-- Description: Optimizes username/email lookups without enforcing uniqueness constraint
-- Date: 2025-12-02
-- Safe for production: Does not modify or delete existing data

-- =====================================================
-- Background:
-- =====================================================
-- This migration adds indexes for better query performance but does NOT
-- enforce uniqueness at the database level due to existing duplicates.
--
-- The application already enforces uniqueness through:
-- 1. /api/auth/check-username endpoint
-- 2. /api/auth/check-email endpoint
-- 3. Server-side validation in registerService
--
-- Future: Clean up duplicates and convert to UNIQUE indexes
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Drop any existing indexes (idempotent)
-- =====================================================

DROP INDEX IF EXISTS idx_users_username_lower;
DROP INDEX IF EXISTS idx_users_email_lower;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_email;

-- =====================================================
-- STEP 2: Create case-insensitive indexes (non-unique)
-- =====================================================

-- Index on LOWER(username) for case-insensitive lookups
-- Used by: getUserByUsernameService, check-username endpoint
CREATE INDEX idx_users_username_lower ON users(LOWER(username));

-- Index on LOWER(email) for case-insensitive lookups
-- Used by: getUserByEmailService, check-email endpoint
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- =====================================================
-- STEP 3: Create regular indexes for exact matches
-- =====================================================

-- Index on username for exact case-sensitive lookups (if needed)
CREATE INDEX idx_users_username ON users(username);

-- Index on email for exact case-sensitive lookups (if needed)
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- STEP 4: Verify indexes were created
-- =====================================================

SELECT
    '=== INDEXES CREATED ===' as status,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND (indexname LIKE '%username%' OR indexname LIKE '%email%')
ORDER BY indexname;

-- =====================================================
-- STEP 5: Show performance improvement
-- =====================================================

-- Show query plan for username lookup (before vs after)
EXPLAIN ANALYZE SELECT * FROM users WHERE LOWER(username) = LOWER('admin') LIMIT 1;

-- Show query plan for email lookup (before vs after)
EXPLAIN ANALYZE SELECT * FROM users WHERE LOWER(email) = LOWER('admin@casino.com') LIMIT 1;

-- =====================================================
-- STEP 6: Show table statistics
-- =====================================================

SELECT
    '=== TABLE STATISTICS ===' as section,
    pg_size_pretty(pg_total_relation_size('users')) AS total_size,
    pg_size_pretty(pg_relation_size('users')) AS table_size,
    pg_size_pretty(pg_total_relation_size('users') - pg_relation_size('users')) AS indexes_size,
    (SELECT COUNT(*) FROM users) as total_users;

-- =====================================================
-- STEP 7: Show remaining duplicates (for monitoring)
-- =====================================================

SELECT
    '=== DUPLICATE USERNAME SUMMARY ===' as section,
    COUNT(*) as duplicate_groups,
    SUM(cnt - 1) as total_duplicates
FROM (
    SELECT LOWER(username) as username_lower, COUNT(*) as cnt
    FROM users
    GROUP BY LOWER(username)
    HAVING COUNT(*) > 1
) dup;

SELECT
    '=== DUPLICATE EMAIL SUMMARY ===' as section,
    COUNT(*) as duplicate_groups,
    SUM(cnt - 1) as total_duplicates
FROM (
    SELECT LOWER(email) as email_lower, COUNT(*) as cnt
    FROM users
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
) dup;

COMMIT;

-- Success message
SELECT '✅ Performance indexes created successfully!' as result;
SELECT '⚡ Username lookups are now much faster (using idx_users_username_lower)' as benefit_1;
SELECT '⚡ Email lookups are now much faster (using idx_users_email_lower)' as benefit_2;
SELECT '🔒 Application-level uniqueness validation is in place' as benefit_3;
SELECT '⚠️  Database-level uniqueness constraint NOT enforced (due to existing duplicates)' as note_1;
SELECT '📋 To enforce database uniqueness: Clean up duplicates first, then run migration-username-email-indexes.sql' as note_2;

-- =====================================================
-- Performance Notes:
-- =====================================================
--
-- Query performance improvement:
-- - Before: Sequential scan O(n) - scans all rows
-- - After:  Index scan O(log n) - uses B-tree index
--
-- Example timing (for 100,000 users):
-- - Sequential scan: ~50ms
-- - Index scan: ~0.5ms (100x faster!)
--
-- Index sizes:
-- - Current users: 67 rows
-- - Index overhead: ~8-16 KB (negligible)
-- - At 1M users: ~50-100 MB per index (still efficient)
--
-- =====================================================
