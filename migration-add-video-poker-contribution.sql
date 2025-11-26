-- Migration: Add video_poker_contribution column to bonus_wager_progress table
-- Date: 2025-11-26
-- Issue: The getPlayerActiveProgress method expects video_poker_contribution but the column doesn't exist

-- Add video_poker_contribution column
ALTER TABLE bonus_wager_progress
ADD COLUMN IF NOT EXISTS video_poker_contribution NUMERIC(15, 2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN bonus_wager_progress.video_poker_contribution IS 'Tracks video poker game contributions to bonus wagering';

-- Display confirmation
SELECT 'Migration completed: video_poker_contribution column added to bonus_wager_progress table' AS status;
