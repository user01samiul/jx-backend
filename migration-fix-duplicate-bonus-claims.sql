-- =====================================================
-- FIX: Prevent Duplicate Bonus Claims
-- =====================================================
-- This migration adds constraints to prevent users from
-- claiming bonuses multiple times when they shouldn't.
-- =====================================================

-- =====================================================
-- 1. Add Partial Unique Index for Single-Claim Bonuses
-- =====================================================
-- For bonus plans with max_trigger_per_player = 1,
-- ensure a player can only have ONE instance (regardless of status)
-- This prevents race conditions when clicking apply multiple times

-- First, check if we have any duplicate instances that would violate the constraint
SELECT
    bp.id as bonus_plan_id,
    bp.name,
    bp.max_trigger_per_player,
    bi.player_id,
    COUNT(*) as claim_count
FROM bonus_instances bi
INNER JOIN bonus_plans bp ON bi.bonus_plan_id = bp.id
WHERE bp.max_trigger_per_player = 1
GROUP BY bp.id, bp.name, bp.max_trigger_per_player, bi.player_id
HAVING COUNT(*) > 1
ORDER BY claim_count DESC;

-- If duplicates exist, you'll need to manually review and remove them before proceeding
-- Uncomment the following to see the duplicate bonus instances:
-- SELECT * FROM bonus_instances
-- WHERE player_id = <PLAYER_ID> AND bonus_plan_id = <BONUS_PLAN_ID>
-- ORDER BY granted_at DESC;

-- =====================================================
-- 2. Create Unique Constraint for Single-Claim Bonuses
-- =====================================================
-- This prevents a player from having multiple instances of the same bonus
-- when max_trigger_per_player = 1

-- Note: We can't create a partial unique index based on another table's column,
-- so we need to create a function-based approach or use application logic.
-- Instead, we'll create a unique index on (player_id, bonus_plan_id, code_used)
-- for coded bonuses to prevent the same code being applied multiple times.

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_coded_bonus_per_player
ON bonus_instances (player_id, bonus_plan_id)
WHERE code_used IS NOT NULL
  AND status IN ('pending', 'active', 'wagering');

-- This ensures that for coded bonuses:
-- 1. A player can only have ONE active/pending/wagering instance of each bonus plan
-- 2. Once completed/expired/forfeited, they could potentially claim again (if max_trigger allows)

-- =====================================================
-- 3. Create Unique Index for Deposit Bonuses (Per Transaction)
-- =====================================================
-- Ensure a deposit transaction can only trigger one bonus instance

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_deposit_bonus_per_transaction
ON bonus_instances (player_id, deposit_transaction_id)
WHERE deposit_transaction_id IS NOT NULL;

-- This prevents a single deposit from triggering multiple bonus instances

-- =====================================================
-- 4. Add Check Function for Max Trigger Enforcement
-- =====================================================
-- Create a function that checks max_trigger_per_player before insert

CREATE OR REPLACE FUNCTION check_bonus_max_trigger()
RETURNS TRIGGER AS $$
DECLARE
    max_allowed INT;
    current_count INT;
BEGIN
    -- Get max_trigger_per_player for this bonus plan
    SELECT max_trigger_per_player INTO max_allowed
    FROM bonus_plans
    WHERE id = NEW.bonus_plan_id;

    -- If no limit, allow
    IF max_allowed IS NULL THEN
        RETURN NEW;
    END IF;

    -- Count existing instances for this player and bonus plan
    SELECT COUNT(*) INTO current_count
    FROM bonus_instances
    WHERE player_id = NEW.player_id
      AND bonus_plan_id = NEW.bonus_plan_id;

    -- Check if limit exceeded
    IF current_count >= max_allowed THEN
        RAISE EXCEPTION 'Maximum bonus claims reached for this promotion (max: %)', max_allowed
            USING ERRCODE = '23505'; -- Unique violation error code
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce max_trigger_per_player on INSERT
DROP TRIGGER IF EXISTS trg_check_bonus_max_trigger ON bonus_instances;
CREATE TRIGGER trg_check_bonus_max_trigger
    BEFORE INSERT ON bonus_instances
    FOR EACH ROW
    EXECUTE FUNCTION check_bonus_max_trigger();

-- =====================================================
-- 5. Add Constraint for Code Usage Limits
-- =====================================================
-- This is already handled by the application, but we'll add a check constraint
-- to ensure current_code_usage never exceeds max_code_usage

ALTER TABLE bonus_plans
ADD CONSTRAINT check_code_usage_limit
CHECK (current_code_usage IS NULL OR max_code_usage IS NULL OR current_code_usage <= max_code_usage);

-- =====================================================
-- 6. Verification Queries
-- =====================================================
-- Run these queries to verify the constraints are working:

-- Check unique indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bonus_instances'
  AND indexname LIKE '%unique%'
ORDER BY indexname;

-- Check triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'bonus_instances';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- What this migration does:
-- 1. Prevents coded bonuses from being claimed multiple times simultaneously
-- 2. Prevents deposit transactions from triggering multiple bonuses
-- 3. Enforces max_trigger_per_player limit at database level
-- 4. Adds check constraint for code usage limits
--
-- Testing:
-- 1. Try applying the same bonus code multiple times rapidly
-- 2. Try making a deposit that should only trigger one bonus
-- 3. Try claiming a bonus after max_trigger_per_player is reached
--
-- All should fail with appropriate error messages
-- =====================================================
