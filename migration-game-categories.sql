-- Create game_categories table
CREATE TABLE IF NOT EXISTS game_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  icon_url VARCHAR(500) DEFAULT '',
  color VARCHAR(7) DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  parent_category_id INTEGER REFERENCES game_categories(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_categories_name ON game_categories(name);
CREATE INDEX IF NOT EXISTS idx_game_categories_is_active ON game_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_game_categories_parent ON game_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_game_categories_display_order ON game_categories(display_order);

-- Add comment
COMMENT ON TABLE game_categories IS 'Game categories for organizing games';
