-- =====================================================
-- FIX: Game Contributions Unique Constraint
-- =====================================================
-- Issue: Partial unique index doesn't work with ON CONFLICT
-- Solution: Create full unique constraint on game_code
-- =====================================================

-- Step 1: Drop the partial unique index
DROP INDEX IF EXISTS uq_game_contributions_game_code;

-- Step 2: Make game_code NOT NULL (required for unique constraint)
UPDATE game_contributions
SET game_code = CONCAT('GAME_', game_id)
WHERE game_code IS NULL;

ALTER TABLE game_contributions
  ALTER COLUMN game_code SET NOT NULL;

-- Step 3: Create full unique constraint on game_code
ALTER TABLE game_contributions
  ADD CONSTRAINT uq_game_contributions_game_code UNIQUE (game_code);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
