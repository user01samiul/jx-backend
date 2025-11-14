-- Migration: Add JxOriginals Games to Database
-- Date: 2024-11-10
-- Description: Inserts all 18 JxOriginals games with full configuration
-- Provider: JxOriginals (internal games with full source code control)

BEGIN;

-- Insert Pragmatic-style games
INSERT INTO games (
  name, provider, category, subcategory, game_code, vendor,
  image_url, thumbnail_url, description,
  rtp_percentage, volatility, min_bet, max_bet, max_win,
  is_featured, is_new, is_hot, is_active,
  features, created_at, updated_at
) VALUES
-- Sweet Bonanza
('Sweet Bonanza', 'JxOriginals', 'slots', 'video_slots', 'sweet_bonanza', 'Pragmatic',
 '/cdn/games/jxoriginals/sweet-bonanza.jpg',
 '/cdn/games/jxoriginals/sweet-bonanza-thumb.jpg',
 'Popular cascade slot with tumbling reels, multipliers up to 100x, and a sweet candy theme. Features free spins bonus with multiplier symbols.',
 96.50, 'high', 0.20, 100.00, 21000.00,
 true, true, true, true,
 '{"paylines": "cluster_pays", "max_multiplier": "100x", "free_spins": true, "bonus_buy": true, "autoplay": true, "turbo_spin": true}',
 NOW(), NOW()),

-- Gates of Olympus
('Gates of Olympus', 'JxOriginals', 'slots', 'video_slots', 'gates_olympus', 'Pragmatic',
 '/cdn/games/jxoriginals/gates-olympus.jpg',
 '/cdn/games/jxoriginals/gates-olympus-thumb.jpg',
 'Greek mythology themed slot featuring Zeus and divine multipliers. Cascade mechanics with up to 500x multipliers in free spins.',
 96.50, 'high', 0.20, 100.00, 5000.00,
 true, true, true, true,
 '{"paylines": "cluster_pays", "max_multiplier": "500x", "free_spins": true, "bonus_buy": true, "autoplay": true, "theme": "mythology"}',
 NOW(), NOW()),

-- Hercules Son of Zeus
('Hercules Son of Zeus', 'JxOriginals', 'slots', 'video_slots', 'hercules_zeus', 'Pragmatic',
 '/cdn/games/jxoriginals/hercules-zeus.jpg',
 '/cdn/games/jxoriginals/hercules-zeus-thumb.jpg',
 'Epic Greek hero adventure with expanding wilds and free spins. High volatility action with massive win potential.',
 96.48, 'high', 0.20, 100.00, 10000.00,
 true, false, true, true,
 '{"paylines": 20, "expanding_wilds": true, "free_spins": true, "autoplay": true, "theme": "mythology"}',
 NOW(), NOW()),

-- Sugar Rush
('Sugar Rush', 'JxOriginals', 'slots', 'video_slots', 'sugar_rush', 'Pragmatic',
 '/cdn/games/jxoriginals/sugar-rush.jpg',
 '/cdn/games/jxoriginals/sugar-rush-thumb.jpg',
 'Colorful candy-themed cluster pays slot with multiplier spots that increase with each win. Features tumbling reels and free spins.',
 96.50, 'high', 0.20, 100.00, 5000.00,
 false, true, false, true,
 '{"paylines": "cluster_pays", "multiplier_spots": true, "tumbling_reels": true, "free_spins": true, "autoplay": true}',
 NOW(), NOW());

-- Insert ISoftBet games
INSERT INTO games (
  name, provider, category, subcategory, game_code, vendor,
  image_url, thumbnail_url, description,
  rtp_percentage, volatility, min_bet, max_bet, max_win,
  is_featured, is_new, is_hot, is_active,
  features, created_at, updated_at
) VALUES
-- Aztec Gold Megaways
('Aztec Gold Megaways', 'JxOriginals', 'slots', 'megaways', 'aztec_gold_megaways', 'ISoftBet',
 '/cdn/games/jxoriginals/aztec-gold.jpg',
 '/cdn/games/jxoriginals/aztec-gold-thumb.jpg',
 'Megaways slot set in ancient Aztec civilization with up to 117,649 ways to win. Features cascading reels and unlimited win multipliers.',
 96.10, 'high', 0.10, 20.00, 10000.00,
 true, true, false, true,
 '{"paylines": "megaways", "max_ways": 117649, "cascading_reels": true, "free_spins": true, "unlimited_multiplier": true}',
 NOW(), NOW()),

-- Fishing for Gold
('Fishing for Gold', 'JxOriginals', 'slots', 'video_slots', 'fishing_gold', 'ISoftBet',
 '/cdn/games/jxoriginals/fishing-gold.jpg',
 '/cdn/games/jxoriginals/fishing-gold-thumb.jpg',
 'Relaxing fishing theme with golden opportunities. Features wild symbols, free spins, and multipliers.',
 96.00, 'medium', 0.20, 50.00, 2500.00,
 false, false, false, true,
 '{"paylines": 25, "wild_symbols": true, "free_spins": true, "multipliers": true, "autoplay": true}',
 NOW(), NOW()),

-- Ghosts n Gold
('Ghosts n Gold', 'JxOriginals', 'slots', 'video_slots', 'ghosts_gold', 'ISoftBet',
 '/cdn/games/jxoriginals/ghosts-gold.jpg',
 '/cdn/games/jxoriginals/ghosts-gold-thumb.jpg',
 'Spooky themed slot with ghostly wilds and haunted free spins. Mystery symbols can reveal big wins.',
 96.05, 'medium', 0.25, 50.00, 3000.00,
 false, false, true, true,
 '{"paylines": 30, "mystery_symbols": true, "wild_symbols": true, "free_spins": true, "theme": "horror"}',
 NOW(), NOW()),

-- Hot Spin Deluxe
('Hot Spin Deluxe', 'JxOriginals', 'slots', 'classic_slots', 'hot_spin_deluxe', 'ISoftBet',
 '/cdn/games/jxoriginals/hot-spin-deluxe.jpg',
 '/cdn/games/jxoriginals/hot-spin-deluxe-thumb.jpg',
 'Classic fruit machine with modern features. Simple gameplay with multipliers and respins.',
 95.98, 'low', 0.10, 100.00, 1000.00,
 false, false, true, true,
 '{"paylines": 5, "classic_style": true, "respins": true, "multipliers": true, "simple_gameplay": true}',
 NOW(), NOW()),

-- Lost Boys Loot
('Lost Boys Loot', 'JxOriginals', 'slots', 'video_slots', 'lost_boys_loot', 'ISoftBet',
 '/cdn/games/jxoriginals/lost-boys-loot.jpg',
 '/cdn/games/jxoriginals/lost-boys-thumb.jpg',
 'Adventure pirate themed slot with treasure hunts and expanding wilds. Free spins with sticky wilds.',
 96.12, 'medium', 0.20, 40.00, 5000.00,
 false, true, false, true,
 '{"paylines": 20, "expanding_wilds": true, "sticky_wilds": true, "free_spins": true, "theme": "pirates"}',
 NOW(), NOW()),

-- Racetrack Riches
('Racetrack Riches', 'JxOriginals', 'slots', 'video_slots', 'racetrack_riches', 'ISoftBet',
 '/cdn/games/jxoriginals/racetrack-riches.jpg',
 '/cdn/games/jxoriginals/racetrack-riches-thumb.jpg',
 'Fast-paced racing themed slot with turbo wins. Features race bonus game and multiplier trails.',
 96.08, 'medium', 0.25, 50.00, 4000.00,
 false, false, false, true,
 '{"paylines": 25, "bonus_game": true, "multiplier_trail": true, "free_spins": true, "theme": "racing"}',
 NOW(), NOW()),

-- Sheriff of Nottingham
('Sheriff of Nottingham', 'JxOriginals', 'slots', 'video_slots', 'sheriff_nottingham', 'ISoftBet',
 '/cdn/games/jxoriginals/sheriff-nottingham.jpg',
 '/cdn/games/jxoriginals/sheriff-nottingham-thumb.jpg',
 'Robin Hood themed slot with forest adventures and free spin features. Arrow wilds and coin respins.',
 96.15, 'medium', 0.20, 50.00, 3500.00,
 true, false, false, true,
 '{"paylines": 30, "arrow_wilds": true, "respin_feature": true, "free_spins": true, "theme": "medieval"}',
 NOW(), NOW()),

-- Stacks O Gold
('Stacks O Gold', 'JxOriginals', 'slots', 'video_slots', 'stacks_gold', 'ISoftBet',
 '/cdn/games/jxoriginals/stacks-gold.jpg',
 '/cdn/games/jxoriginals/stacks-gold-thumb.jpg',
 'Irish luck themed slot with stacked symbols and rainbow multipliers. Leprechaun bonus rounds.',
 96.10, 'medium', 0.20, 50.00, 5000.00,
 false, false, true, true,
 '{"paylines": 20, "stacked_symbols": true, "bonus_rounds": true, "multipliers": true, "theme": "irish"}',
 NOW(), NOW()),

-- The Golden City
('The Golden City', 'JxOriginals', 'slots', 'video_slots', 'golden_city', 'ISoftBet',
 '/cdn/games/jxoriginals/golden-city.jpg',
 '/cdn/games/jxoriginals/golden-city-thumb.jpg',
 'Ancient civilization themed slot with golden treasures. Features expanding symbols and free spins with enhanced multipliers.',
 96.18, 'high', 0.20, 50.00, 8000.00,
 true, true, true, true,
 '{"paylines": 25, "expanding_symbols": true, "free_spins": true, "enhanced_multipliers": true, "theme": "ancient"}',
 NOW(), NOW()),

-- Wild Ape
('Wild Ape', 'JxOriginals', 'slots', 'video_slots', 'wild_ape', 'ISoftBet',
 '/cdn/games/jxoriginals/wild-ape.jpg',
 '/cdn/games/jxoriginals/wild-ape-thumb.jpg',
 'Jungle adventure with wild ape features. Colossal symbols and mega wilds for massive wins.',
 96.05, 'high', 0.20, 50.00, 6000.00,
 false, true, false, true,
 '{"paylines": 40, "colossal_symbols": true, "mega_wilds": true, "free_spins": true, "theme": "jungle"}',
 NOW(), NOW());

-- Insert CryptoTech games
INSERT INTO games (
  name, provider, category, subcategory, game_code, vendor,
  image_url, thumbnail_url, description,
  rtp_percentage, volatility, min_bet, max_bet, max_win,
  is_featured, is_new, is_hot, is_active,
  features, created_at, updated_at
) VALUES
-- American Gigolo
('American Gigolo', 'JxOriginals', 'slots', 'video_slots', 'american_gigolo', 'CryptoTech',
 '/cdn/games/jxoriginals/american-gigolo.jpg',
 '/cdn/games/jxoriginals/american-gigolo-thumb.jpg',
 'Retro American themed slot with classic car symbols and neon lights. Features free spins and expanding wilds.',
 95.95, 'medium', 0.25, 50.00, 4000.00,
 false, false, false, true,
 '{"paylines": 20, "expanding_wilds": true, "free_spins": true, "retro_theme": true, "theme": "american"}',
 NOW(), NOW()),

-- Bavarian Forest
('Bavarian Forest', 'JxOriginals', 'slots', 'video_slots', 'bavarian_forest', 'CryptoTech',
 '/cdn/games/jxoriginals/bavarian-forest.jpg',
 '/cdn/games/jxoriginals/bavarian-forest-thumb.jpg',
 'German forest themed slot with wildlife symbols. Nature-inspired gameplay with cascading wins and multipliers.',
 96.00, 'medium', 0.20, 50.00, 3500.00,
 false, false, false, true,
 '{"paylines": 25, "cascading_wins": true, "multipliers": true, "free_spins": true, "theme": "nature"}',
 NOW(), NOW());

-- Log the migration
INSERT INTO user_activity_logs (user_id, action, category, description, metadata, created_by)
VALUES (
  1,
  'system_migration',
  'system',
  'Added 18 JxOriginals games to database',
  '{"migration": "20241110_add_jxoriginals_games", "games_added": 18, "provider": "JxOriginals"}',
  1
);

COMMIT;

-- Verification query
SELECT
  provider,
  vendor,
  COUNT(*) as game_count,
  STRING_AGG(name, ', ' ORDER BY name) as games
FROM games
WHERE provider = 'JxOriginals'
GROUP BY provider, vendor
ORDER BY vendor;
