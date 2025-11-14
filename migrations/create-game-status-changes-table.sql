-- Migration: Create game_status_changes table
-- This table logs all game status changes for audit purposes

-- Create game_status_changes table
CREATE TABLE IF NOT EXISTS game_status_changes (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('enabled', 'disabled')),
  reason TEXT,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_status_changes_game_id ON game_status_changes(game_id);
CREATE INDEX IF NOT EXISTS idx_game_status_changes_admin_id ON game_status_changes(admin_id);
CREATE INDEX IF NOT EXISTS idx_game_status_changes_created_at ON game_status_changes(created_at);
CREATE INDEX IF NOT EXISTS idx_game_status_changes_action ON game_status_changes(action);

-- Add comments for documentation
COMMENT ON TABLE game_status_changes IS 'Logs all game status changes (enable/disable) for audit purposes';
COMMENT ON COLUMN game_status_changes.game_id IS 'Reference to the game that was modified';
COMMENT ON COLUMN game_status_changes.action IS 'Action performed: enabled or disabled';
COMMENT ON COLUMN game_status_changes.reason IS 'Reason for the status change';
COMMENT ON COLUMN game_status_changes.admin_id IS 'Admin user who performed the action';

-- Insert sample audit log entry
INSERT INTO game_status_changes (game_id, action, reason, admin_id) 
VALUES (1, 'disabled', 'Sample audit log entry', 1)
ON CONFLICT DO NOTHING;

-- Update games table to ensure is_active column exists and has proper constraints
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add constraint to ensure is_active is not null
ALTER TABLE games 
ALTER COLUMN is_active SET NOT NULL;

-- Add comment to games table
COMMENT ON COLUMN games.is_active IS 'Whether the game is active and available for play';

-- Update existing games to ensure they are active by default
UPDATE games SET is_active = TRUE WHERE is_active IS NULL; 