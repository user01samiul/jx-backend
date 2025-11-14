-- =====================================================
-- JACKPOTX ENTERPRISE FEATURES - DATABASE SCHEMA
-- =====================================================
-- Features: Challenges, Loyalty System, Mini-Games, Personal Jackpots,
-- Advanced Affiliates, Risk Management, Custom Reports
-- =====================================================

-- =====================================================
-- 1. CHALLENGES SYSTEM (like EveryMatrix Challenges)
-- =====================================================

-- Challenge templates (admin creates these)
CREATE TABLE IF NOT EXISTS challenge_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'SPIN_COUNT', 'WIN_AMOUNT', 'DEPOSIT', 'PLAY_GAME', 'CONSECUTIVE_DAYS'
    target_value DECIMAL(20,2) NOT NULL, -- e.g., "10" spins, "100" EUR win
    reward_type VARCHAR(50) NOT NULL, -- 'BONUS_MONEY', 'FREE_SPINS', 'LOYALTY_POINTS', 'SHOP_ITEM'
    reward_value DECIMAL(20,2) NOT NULL,
    duration_hours INTEGER, -- How long player has to complete
    game_ids INTEGER[], -- Specific games (NULL = any game)
    min_bet DECIMAL(20,2),
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'PAUSED', 'ARCHIVED'
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player challenges (assigned to players)
CREATE TABLE IF NOT EXISTS player_challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER NOT NULL REFERENCES challenge_templates(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CLAIMED'
    progress DECIMAL(20,2) DEFAULT 0,
    target DECIMAL(20,2) NOT NULL,
    reward_claimed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, template_id, started_at)
);

CREATE INDEX idx_player_challenges_user ON player_challenges(user_id);
CREATE INDEX idx_player_challenges_status ON player_challenges(status);

-- =====================================================
-- 2. LOYALTY SYSTEM (like EveryMatrix LoyaltyEngine)
-- =====================================================

-- Loyalty tiers/levels
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 'Bronze', 'Silver', 'Gold', 'Platinum', 'VIP'
    level INTEGER NOT NULL UNIQUE,
    points_required DECIMAL(20,2) NOT NULL,
    color VARCHAR(7), -- Hex color for UI
    icon_url VARCHAR(500),
    benefits JSONB, -- {"rakeback": 5, "birthday_bonus": 50, "faster_withdrawals": true}
    point_multiplier DECIMAL(5,2) DEFAULT 1.0, -- 1.5x points for VIP
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player loyalty status
CREATE TABLE IF NOT EXISTS player_loyalty (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tier_id INTEGER NOT NULL REFERENCES loyalty_tiers(id),
    total_points DECIMAL(20,2) DEFAULT 0,
    available_points DECIMAL(20,2) DEFAULT 0, -- Points that can be spent
    lifetime_points DECIMAL(20,2) DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_loyalty_user ON player_loyalty(user_id);
CREATE INDEX idx_player_loyalty_tier ON player_loyalty(tier_id);

-- Loyalty point transactions
CREATE TABLE IF NOT EXISTS loyalty_point_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'EARNED_BET', 'EARNED_DEPOSIT', 'SPENT_SHOP', 'BONUS_REWARD', 'TIER_BONUS'
    points DECIMAL(20,2) NOT NULL,
    balance_before DECIMAL(20,2),
    balance_after DECIMAL(20,2),
    description TEXT,
    reference_id INTEGER, -- Link to bet, purchase, etc.
    reference_type VARCHAR(50), -- 'BET', 'SHOP_PURCHASE', 'CHALLENGE'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_transactions_user ON loyalty_point_transactions(user_id);

-- Loyalty shop items
CREATE TABLE IF NOT EXISTS loyalty_shop_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    category VARCHAR(50), -- 'BONUS', 'FREE_SPINS', 'MERCHANDISE', 'PHYSICAL_PRIZE'
    points_cost DECIMAL(20,2) NOT NULL,
    real_value DECIMAL(20,2), -- Actual value in currency
    currency_code VARCHAR(3) DEFAULT 'USD',
    stock INTEGER, -- NULL = unlimited
    max_per_user INTEGER, -- NULL = unlimited
    min_tier_level INTEGER DEFAULT 1,
    type VARCHAR(50) NOT NULL, -- 'BONUS_MONEY', 'FREE_SPINS', 'PHYSICAL', 'CASHBACK'
    reward_data JSONB, -- {"bonus_amount": 50, "wagering": 35, "game_ids": [1,2,3]}
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty shop purchases
CREATE TABLE IF NOT EXISTS loyalty_shop_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES loyalty_shop_items(id),
    points_spent DECIMAL(20,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'DELIVERED', 'CANCELLED'
    reward_credited BOOLEAN DEFAULT FALSE,
    delivery_info JSONB, -- For physical items
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP
);

CREATE INDEX idx_shop_purchases_user ON loyalty_shop_purchases(user_id);

-- =====================================================
-- 3. MINI-GAMES / PRIZE ENGINE (Wheel, Mystery Box, Dice)
-- =====================================================

CREATE TABLE IF NOT EXISTS mini_game_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 'Lucky Wheel', 'Mystery Chest', 'Daily Dice'
    identifier VARCHAR(50) UNIQUE NOT NULL, -- 'lucky_wheel', 'mystery_chest', 'daily_dice'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB, -- Game-specific configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prize pools for mini-games
CREATE TABLE IF NOT EXISTS mini_game_prizes (
    id SERIAL PRIMARY KEY,
    game_type_id INTEGER NOT NULL REFERENCES mini_game_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'BONUS_MONEY', 'FREE_SPINS', 'LOYALTY_POINTS', 'MULTIPLIER', 'NOTHING'
    value DECIMAL(20,2) NOT NULL,
    probability DECIMAL(5,4) NOT NULL, -- 0.0001 to 1.0 (0.01% to 100%)
    weight INTEGER DEFAULT 1,
    color VARCHAR(7), -- For UI
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player mini-game plays
CREATE TABLE IF NOT EXISTS player_mini_game_plays (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type_id INTEGER NOT NULL REFERENCES mini_game_types(id),
    prize_id INTEGER REFERENCES mini_game_prizes(id),
    prize_value DECIMAL(20,2),
    prize_type VARCHAR(50),
    credited BOOLEAN DEFAULT FALSE,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mini_game_plays_user ON player_mini_game_plays(user_id);

-- Player mini-game spins/attempts (cooldowns)
CREATE TABLE IF NOT EXISTS player_mini_game_spins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type_id INTEGER NOT NULL REFERENCES mini_game_types(id),
    spins_available INTEGER DEFAULT 1,
    last_spin_at TIMESTAMP,
    next_available_at TIMESTAMP,
    daily_spins_used INTEGER DEFAULT 0,
    reset_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_type_id)
);

-- =====================================================
-- 4. PERSONAL JACKPOTS (like EveryMatrix Personal Jackpots)
-- =====================================================

CREATE TABLE IF NOT EXISTS personal_jackpot_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    seed_amount DECIMAL(20,2) DEFAULT 10,
    max_amount DECIMAL(20,2) DEFAULT 10000,
    contribution_percent DECIMAL(5,4) DEFAULT 0.01, -- 1% of bets
    win_probability DECIMAL(10,8) DEFAULT 0.0001, -- 0.01% chance per spin
    min_bet DECIMAL(20,2) DEFAULT 0.10,
    currency_code VARCHAR(3) DEFAULT 'USD',
    game_ids INTEGER[], -- NULL = all games
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Each player has their own personal jackpot instances
CREATE TABLE IF NOT EXISTS player_personal_jackpots (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    config_id INTEGER NOT NULL REFERENCES personal_jackpot_configs(id),
    current_amount DECIMAL(20,2) DEFAULT 0,
    total_contributed DECIMAL(20,2) DEFAULT 0,
    times_won INTEGER DEFAULT 0,
    last_won_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, config_id)
);

CREATE INDEX idx_personal_jackpots_user ON player_personal_jackpots(user_id);

-- Personal jackpot wins history
CREATE TABLE IF NOT EXISTS personal_jackpot_wins (
    id SERIAL PRIMARY KEY,
    jackpot_id INTEGER NOT NULL REFERENCES player_personal_jackpots(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount_won DECIMAL(20,2) NOT NULL,
    game_id INTEGER,
    bet_amount DECIMAL(20,2),
    won_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. ADVANCED AFFILIATE SYSTEM (like PartnerMatrix)
-- =====================================================

-- Affiliate tiers/levels
CREATE TABLE IF NOT EXISTS affiliate_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL UNIQUE,
    commission_percent DECIMAL(5,2) NOT NULL,
    min_players INTEGER DEFAULT 0,
    min_revenue DECIMAL(20,2) DEFAULT 0,
    benefits JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced affiliate profiles
CREATE TABLE IF NOT EXISTS affiliate_profiles_enhanced (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tier_id INTEGER REFERENCES affiliate_tiers(id),
    parent_affiliate_id INTEGER REFERENCES affiliate_profiles_enhanced(id), -- Multi-level
    commission_model VARCHAR(50) DEFAULT 'REVENUE_SHARE', -- 'REVENUE_SHARE', 'CPA', 'HYBRID'
    custom_commission DECIMAL(5,2), -- Override default tier commission
    total_referred INTEGER DEFAULT 0,
    active_players INTEGER DEFAULT 0,
    lifetime_earnings DECIMAL(20,2) DEFAULT 0,
    pending_earnings DECIMAL(20,2) DEFAULT 0,
    paid_earnings DECIMAL(20,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'BANNED'
    payment_method VARCHAR(50),
    payment_details JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Affiliate tracking links
CREATE TABLE IF NOT EXISTS affiliate_tracking_links (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliate_profiles_enhanced(id) ON DELETE CASCADE,
    link_code VARCHAR(100) UNIQUE NOT NULL,
    campaign_name VARCHAR(255),
    url VARCHAR(500) NOT NULL,
    clicks INTEGER DEFAULT 0,
    registrations INTEGER DEFAULT 0,
    ftd_count INTEGER DEFAULT 0, -- First Time Deposits
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracking_links_code ON affiliate_tracking_links(link_code);

-- Affiliate click tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliate_profiles_enhanced(id),
    link_id INTEGER NOT NULL REFERENCES affiliate_tracking_links(id),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    country VARCHAR(2),
    device_type VARCHAR(20), -- 'DESKTOP', 'MOBILE', 'TABLET'
    converted BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_date ON affiliate_clicks(clicked_at);

-- Affiliate commission transactions
CREATE TABLE IF NOT EXISTS affiliate_commission_transactions (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL REFERENCES affiliate_profiles_enhanced(id),
    player_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'REVENUE_SHARE', 'CPA', 'SUB_AFFILIATE'
    amount DECIMAL(20,2) NOT NULL,
    base_amount DECIMAL(20,2), -- Player's loss/deposit
    commission_percent DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'PAID'
    paid_at TIMESTAMP,
    month INTEGER,
    year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commission_trans_affiliate ON affiliate_commission_transactions(affiliate_id);

-- =====================================================
-- 6. RISK MANAGEMENT SYSTEM
-- =====================================================

-- Risk rules (like EveryMatrix rule-based processing)
CREATE TABLE IF NOT EXISTS risk_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'BET', 'LOGIN', 'BONUS_CLAIM'
    condition JSONB NOT NULL, -- {"field": "amount", "operator": ">", "value": 1000}
    action VARCHAR(50) NOT NULL, -- 'FLAG', 'BLOCK', 'REQUIRE_REVIEW', 'AUTO_DECLINE'
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk events/flags
CREATE TABLE IF NOT EXISTS risk_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rule_id INTEGER REFERENCES risk_rules(id),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    metadata JSONB, -- Event details
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'
    assigned_to INTEGER REFERENCES backoffice_users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_risk_events_user ON risk_events(user_id);
CREATE INDEX idx_risk_events_status ON risk_events(status);

-- Player risk score
CREATE TABLE IF NOT EXISTS player_risk_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    risk_score INTEGER DEFAULT 0, -- 0-100
    risk_level VARCHAR(20) DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    factors JSONB, -- {"large_deposits": 10, "unusual_pattern": 15, "chargebacks": 25}
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. CUSTOM REPORTS SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS custom_reports (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL REFERENCES backoffice_users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL, -- 'PLAYERS', 'REVENUE', 'GAMES', 'AFFILIATES', 'CUSTOM'
    data_sources JSONB, -- Tables/views to query
    filters JSONB, -- {"date_from": "2024-01-01", "country": "US"}
    columns JSONB, -- Selected columns
    aggregations JSONB, -- SUM, AVG, COUNT
    schedule VARCHAR(50), -- 'MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'
    recipients TEXT[], -- Email addresses
    last_run_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_executions (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
    executed_by INTEGER REFERENCES backoffice_users(id),
    status VARCHAR(20) DEFAULT 'RUNNING', -- 'RUNNING', 'COMPLETED', 'FAILED'
    row_count INTEGER,
    file_url VARCHAR(500), -- S3/storage URL
    execution_time_ms INTEGER,
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES AND PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_date ON loyalty_point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_user_status ON player_challenges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mini_game_user_date ON player_mini_game_plays(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_events_date ON risk_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_comm_date ON affiliate_commission_transactions(created_at DESC);

-- =====================================================
-- SEED DATA - INITIAL CONFIGURATIONS
-- =====================================================

-- Insert default loyalty tiers
INSERT INTO loyalty_tiers (name, level, points_required, color, point_multiplier, benefits) VALUES
('Bronze', 1, 0, '#CD7F32', 1.0, '{"rakeback": 0, "birthday_bonus": 10}'),
('Silver', 2, 1000, '#C0C0C0', 1.2, '{"rakeback": 2, "birthday_bonus": 25}'),
('Gold', 3, 5000, '#FFD700', 1.5, '{"rakeback": 5, "birthday_bonus": 50, "priority_support": true}'),
('Platinum', 4, 25000, '#E5E4E2', 2.0, '{"rakeback": 10, "birthday_bonus": 100, "priority_support": true, "faster_withdrawals": true}'),
('VIP', 5, 100000, '#9966CC', 3.0, '{"rakeback": 15, "birthday_bonus": 500, "priority_support": true, "faster_withdrawals": true, "personal_manager": true}')
ON CONFLICT DO NOTHING;

-- Insert default mini-game types
INSERT INTO mini_game_types (name, identifier, description, config) VALUES
('Lucky Wheel', 'lucky_wheel', 'Spin the wheel for prizes!', '{"spins_per_day": 1, "free_spin_on_deposit": true}'),
('Mystery Chest', 'mystery_chest', 'Open chests to reveal rewards!', '{"opens_per_day": 3, "chest_types": ["bronze", "silver", "gold"]}'),
('Daily Dice', 'daily_dice', 'Roll the dice for your daily bonus!', '{"rolls_per_day": 1, "multiplier_range": [1, 10]}')
ON CONFLICT DO NOTHING;

-- Insert default personal jackpot config
INSERT INTO personal_jackpot_configs (name, seed_amount, max_amount, contribution_percent, win_probability) VALUES
('Personal Jackpot', 10.00, 10000.00, 0.01, 0.0001)
ON CONFLICT DO NOTHING;

-- Insert default affiliate tiers
INSERT INTO affiliate_tiers (name, level, commission_percent, min_players, min_revenue) VALUES
('Starter', 1, 20.00, 0, 0),
('Bronze', 2, 25.00, 10, 1000),
('Silver', 3, 30.00, 50, 10000),
('Gold', 4, 35.00, 100, 50000),
('Platinum', 5, 40.00, 500, 250000)
ON CONFLICT DO NOTHING;

COMMIT;
