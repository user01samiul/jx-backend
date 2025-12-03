-- Migration: Add indexes for username and email case-insensitive lookups
-- Description: Optimizes username/email availability checks and enforces case-insensitive uniqueness
-- Date: 2025-12-02

-- =====================================================
-- 1. Create unique indexes on LOWER(username) and LOWER(email)
-- =====================================================

-- This enforces case-insensitive uniqueness at the database level
-- and significantly improves query performance for lookups

-- Drop existing indexes if they exist (idempotent migration)
DROP INDEX IF EXISTS idx_users_username_lower;
DROP INDEX IF EXISTS idx_users_email_lower;
DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_email;

-- Create unique index on lowercase username
-- This prevents 'User123' and 'user123' from both existing
CREATE UNIQUE INDEX idx_users_username_lower ON users(LOWER(username));

-- Create unique index on lowercase email
-- This prevents 'User@Example.com' and 'user@example.com' from both existing
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));

-- Create regular indexes for exact match queries (optional, for performance)
-- These are useful if you ever need to query with exact case matching
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- 2. Verify indexes were created
-- =====================================================

-- Show all indexes on users table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND (indexname LIKE '%username%' OR indexname LIKE '%email%')
ORDER BY indexname;

-- =====================================================
-- 3. Test case-insensitive uniqueness (optional verification)
-- =====================================================

-- This query should succeed (checking if the constraint works)
-- Uncomment to test after migration:
-- DO $$
-- BEGIN
--     -- Try to insert duplicate username with different case
--     BEGIN
--         INSERT INTO users (username, email, password, status_id)
--         VALUES ('TESTUSER999', 'test999@test.com', 'hash', 1);
--
--         -- This should fail due to unique constraint
--         INSERT INTO users (username, email, password, status_id)
--         VALUES ('testuser999', 'test999-2@test.com', 'hash', 1);
--
--         RAISE EXCEPTION 'Test failed: Duplicate username was allowed!';
--     EXCEPTION WHEN unique_violation THEN
--         RAISE NOTICE 'Test passed: Duplicate username with different case was correctly rejected';
--         ROLLBACK;
--     END;
-- END $$;

-- =====================================================
-- Performance Notes:
-- =====================================================
--
-- Before indexes:
-- - Username/email lookups: Sequential scan (slow for large tables)
-- - Query time: O(n) where n = number of users
--
-- After indexes:
-- - Username/email lookups: Index scan (fast)
-- - Query time: O(log n) - logarithmic time complexity
-- - For 1 million users: ~20 index lookups vs 1 million row scans
--
-- Index size estimation:
-- - Each index: ~50-100 bytes per row
-- - For 100k users: ~5-10 MB per index (minimal overhead)
--
-- Trade-offs:
-- - Pros: Much faster lookups, enforces uniqueness at DB level
-- - Cons: Slightly slower inserts (negligible), extra storage (minimal)
--
-- =====================================================

-- Show table size and index sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename = 'users';

-- Migration complete
