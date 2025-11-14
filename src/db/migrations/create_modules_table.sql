-- Create modules table for navigation management
CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  path VARCHAR(255),
  icons TEXT,
  newtab BOOLEAN DEFAULT false,
  "parentId" INTEGER REFERENCES modules(id) ON DELETE SET NULL,
  "menuName" VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_modules_parent_id ON modules("parentId");
CREATE INDEX IF NOT EXISTS idx_modules_menu_name ON modules("menuName");
CREATE INDEX IF NOT EXISTS idx_modules_title ON modules(title);
CREATE INDEX IF NOT EXISTS idx_modules_parent_menu ON modules("parentId", "menuName");

-- Add comments for documentation
COMMENT ON TABLE modules IS 'Navigation modules for organizing menu structure';
COMMENT ON COLUMN modules.title IS 'Display title of the module';
COMMENT ON COLUMN modules.subtitle IS 'Subtitle or additional text for the module';
COMMENT ON COLUMN modules.path IS 'Route path for the module (e.g., /casino)';
COMMENT ON COLUMN modules.icons IS 'Icon component or class for the module';
COMMENT ON COLUMN modules.newtab IS 'Whether to open the module in a new tab';
COMMENT ON COLUMN modules."parentId" IS 'Parent module ID for hierarchical structure';
COMMENT ON COLUMN modules."menuName" IS 'Menu name where this module appears (e.g., sidebar, header)';
COMMENT ON COLUMN modules.created_at IS 'Timestamp when the module was created';
COMMENT ON COLUMN modules.updated_at IS 'Timestamp when the module was last updated';

-- Insert sample data
INSERT INTO modules (id, title, subtitle, path, icons, newtab, "parentId", "menuName") VALUES
(1, 'Casino', 'Casino', '', '<Shuffle />', false, null, 'sidebar'),
(2, 'Top Picks', 'TopPicks', '/toppicks', '<LayoutDashboard />', false, 1, 'sidebar'),
(3, 'Slots', 'Slots', '/slots', '<Dice5 />', false, 1, 'sidebar'),
(4, 'Live Casino', 'Live-Casino', '/livecasino', '<Calendar />', false, 1, 'sidebar')
ON CONFLICT (id) DO NOTHING; 