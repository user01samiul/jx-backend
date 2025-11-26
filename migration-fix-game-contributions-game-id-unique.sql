-- =====================================================
-- FIX: Use game_id as unique identifier, not game_code
-- =====================================================
-- Issue: game_code is not unique (multiple games can have same code)
-- Solution: Use game_id as unique identifier
-- =====================================================

-- Step 1: Drop unique constraint on game_code
ALTER TABLE game_contributions
  DROP CONSTRAINT IF EXISTS uq_game_contributions_game_code;

-- Step 2: Ensure game_id is NOT NULL
UPDATE game_contributions
SET game_id = (SELECT id FROM games WHERE game_code = game_contributions.game_code LIMIT 1)
WHERE game_id IS NULL;

ALTER TABLE game_contributions
  ALTER COLUMN game_id SET NOT NULL;

-- Step 3: Add unique constraint on game_id
ALTER TABLE game_contributions
  ADD CONSTRAINT uq_game_contributions_game_id UNIQUE (game_id);

-- Step 4: Keep game_code index for search but not unique
-- (already exists as idx_game_contributions_game_code)

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
