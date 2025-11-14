-- Import sample PG Soft games from CSV data
-- This script inserts a few sample games from the CSV file

-- First, let's clear any existing PG Soft games to avoid duplicates
DELETE FROM games WHERE provider = 'PG Soft';

-- Insert sample PG Soft games
INSERT INTO games (name, provider, vendor, category, game_code, is_active, created_at, updated_at) VALUES
('Chicky Run', 'PG Soft', 'pgsoft', 'crashgame', '51134', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Alchemy Gold', 'PG Soft', 'pgsoft', 'slots', '51101', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Anubis Wrath', 'PG Soft', 'pgsoft', 'slots', '51131', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Asgardian Rising', 'PG Soft', 'pgsoft', 'slots', '51103', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Bakery Bonanza', 'PG Soft', 'pgsoft', 'slots', '51108', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Bali Vacation', 'PG Soft', 'pgsoft', 'slots', '51062', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Battleground Royale', 'PG Soft', 'pgsoft', 'slots', '51090', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Bikini Paradise', 'PG Soft', 'pgsoft', 'slots', '51042', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Buffalo Win', 'PG Soft', 'pgsoft', 'slots', '51074', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Butterfly Blossom', 'PG Soft', 'pgsoft', 'slots', '51091', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Baccarat Deluxe', 'PG Soft', 'pgsoft', 'tablegames', '51014', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Show summary of imported games
SELECT 
  category,
  COUNT(*) as game_count
FROM games 
WHERE provider = 'PG Soft' 
GROUP BY category 
ORDER BY category;

-- Show all imported games
SELECT id, name, provider, vendor, category, game_code 
FROM games 
WHERE provider = 'PG Soft' 
ORDER BY name; 