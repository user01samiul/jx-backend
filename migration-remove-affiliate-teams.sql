-- Migration: Remove Affiliate Teams Structure
-- Date: 2025-11-30
-- Description: Removes teams functionality from affiliate system

-- Step 1: Drop dependent views
DROP VIEW IF EXISTS team_mlm_performance CASCADE;

-- Step 2: Remove team_id from affiliate_profiles
ALTER TABLE affiliate_profiles
DROP COLUMN IF EXISTS team_id CASCADE;

-- Step 3: Remove manager_id from affiliate_profiles
ALTER TABLE affiliate_profiles
DROP COLUMN IF EXISTS manager_id CASCADE;

-- Step 4: Remove team_id from affiliate_commissions (if exists)
ALTER TABLE affiliate_commissions
DROP COLUMN IF EXISTS team_id;

-- Step 5: Drop team_performance table
DROP TABLE IF EXISTS team_performance;

-- Step 6: Drop affiliate_teams table
DROP TABLE IF EXISTS affiliate_teams CASCADE;

-- Verification queries (run these after migration to confirm)
-- SELECT COUNT(*) FROM affiliate_profiles WHERE team_id IS NOT NULL;  -- Should error (column doesn't exist)
-- SELECT COUNT(*) FROM affiliate_teams;  -- Should error (table doesn't exist)
