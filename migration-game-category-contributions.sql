-- Migration: Add game category contributions table
-- This allows setting wagering contributions for entire game categories

CREATE TABLE IF NOT EXISTS game_category_contributions (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL UNIQUE,
  wagering_contribution_percentage DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
  is_restricted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_category_contributions_category ON game_category_contributions(category);

-- Add some default category settings based on industry standards
INSERT INTO game_category_contributions (category, wagering_contribution_percentage, is_restricted) VALUES
('slots', 100.00, FALSE),
('table_games', 10.00, FALSE),
('live_casino', 15.00, FALSE),
('video_poker', 50.00, FALSE),
('other', 50.00, FALSE)
ON CONFLICT (category) DO NOTHING;

-- Add comment
COMMENT ON TABLE game_category_contributions IS 'Wagering contribution settings by game category - applies to all games in category unless overridden by game-specific settings';
