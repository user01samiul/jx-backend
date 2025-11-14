-- =====================================================
-- MIGRATION: Add Game Categories Table
-- =====================================================
-- This migration adds a proper game_categories table for better category management

BEGIN;

-- Create game_categories table
CREATE TABLE IF NOT EXISTS game_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  color VARCHAR(7), -- Hex color code
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  parent_category_id INTEGER REFERENCES game_categories(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_by INTEGER DEFAULT 1
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_categories_name ON game_categories(name);
CREATE INDEX IF NOT EXISTS idx_game_categories_active ON game_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_game_categories_parent ON game_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_game_categories_display_order ON game_categories(display_order);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at_game_categories()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at_game_categories
BEFORE UPDATE ON game_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at_game_categories();

-- Add some default categories based on common game types
INSERT INTO game_categories (name, display_name, description, display_order, is_active) VALUES
('slots', 'Slots', 'Slot machine games with various themes and features', 1, true),
('table-games', 'Table Games', 'Classic casino table games like blackjack, roulette, poker', 2, true),
('live-casino', 'Live Casino', 'Live dealer games with real-time interaction', 3, true),
('jackpot', 'Jackpot Games', 'Games with progressive or fixed jackpots', 4, true),
('arcade', 'Arcade Games', 'Fun arcade-style games and instant win games', 5, true),
('bingo', 'Bingo', 'Bingo games and variations', 6, true),
('scratch-cards', 'Scratch Cards', 'Instant win scratch card games', 7, true),
('virtual-sports', 'Virtual Sports', 'Virtual sports betting games', 8, true),
('lottery', 'Lottery', 'Lottery and number games', 9, true),
('other', 'Other Games', 'Miscellaneous games and special categories', 10, true)
ON CONFLICT (name) DO NOTHING;

COMMIT; 