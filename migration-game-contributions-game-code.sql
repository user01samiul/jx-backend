-- =====================================================
-- MIGRATION: Add game_code to game_contributions
-- =====================================================
-- This migration adds game_code column alongside game_id
-- to support lookup by game code instead of game ID
-- =====================================================

-- Step 1: Add game_code column
ALTER TABLE game_contributions
  ADD COLUMN IF NOT EXISTS game_code VARCHAR(255);

-- Step 2: Populate game_code from games table (if data exists)
UPDATE game_contributions gc
SET game_code = (
  SELECT g.game_code
  FROM games g
  WHERE g.id = gc.game_id
)
WHERE game_code IS NULL AND game_id IS NOT NULL;

-- Step 3: Add unique constraint on game_code
CREATE UNIQUE INDEX IF NOT EXISTS uq_game_contributions_game_code
  ON game_contributions(game_code)
  WHERE game_code IS NOT NULL;

-- Step 4: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_contributions_game_code
  ON game_contributions(game_code);

-- Step 5: Make game_id nullable (we'll use game_code as primary identifier)
ALTER TABLE game_contributions
  ALTER COLUMN game_id DROP NOT NULL;

-- Step 6: Drop old unique constraint on game_id if it exists
ALTER TABLE game_contributions
  DROP CONSTRAINT IF EXISTS game_contributions_game_id_key;

COMMENT ON COLUMN game_contributions.game_code IS 'Game identifier code (e.g., SLOT_STARBURST)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run migration: psql -U postgres -d jackpotx-db -f migration-game-contributions-game-code.sql
-- 2. Update API to use game_code instead of game_id
-- 3. Test with curl/Postman
-- =====================================================
