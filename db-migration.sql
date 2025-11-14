-- =====================================================
-- DATABASE MIGRATION SCRIPT
-- =====================================================
-- This script syncs the existing database with db-script.sql
-- Run this to add missing columns, views, and tables

BEGIN;

-- =====================================================
-- ADD MISSING COLUMNS
-- =====================================================

-- Add missing is_2fa_enabled column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

-- =====================================================
-- CREATE MISSING TABLES
-- =====================================================

-- Create payment_gateways table
CREATE TABLE IF NOT EXISTS payment_gateways (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  api_endpoint VARCHAR(500),
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  supported_currencies TEXT[],
  supported_countries TEXT[],
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  processing_time VARCHAR(50),
  fees_percentage DECIMAL(5,2),
  fees_fixed DECIMAL(10,2),
  auto_approval BOOLEAN DEFAULT FALSE,
  requires_kyc BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create captcha table
CREATE TABLE IF NOT EXISTS captcha (
  id VARCHAR(100) PRIMARY KEY,
  text VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Add table for dynamic game provider configs
CREATE TABLE IF NOT EXISTS game_provider_configs (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(100) NOT NULL UNIQUE,
  api_key VARCHAR(255) NOT NULL,
  api_secret VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CREATE MISSING VIEWS
-- =====================================================

-- View: user_gaming_analytics
CREATE OR REPLACE VIEW user_gaming_analytics AS
SELECT
  u.id as user_id,
  u.username,
  up.first_name,
  up.last_name,
  COUNT(DISTINCT b.id) as total_bets,
  SUM(b.bet_amount) as total_wagered,
  SUM(b.win_amount) as total_won,
  SUM(b.win_amount) - SUM(b.bet_amount) as net_profit,
  COUNT(DISTINCT b.game_id) as games_played,
  COUNT(DISTINCT DATE(b.placed_at)) as active_days,
  AVG(b.bet_amount) as avg_bet_amount,
  MAX(b.placed_at) as last_bet_at
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN bets b ON u.id = b.user_id
GROUP BY u.id, u.username, up.first_name, up.last_name;

-- View: user_financial_summary
CREATE OR REPLACE VIEW user_financial_summary AS
SELECT
  u.id as user_id,
  u.username,
  ub.balance,
  ub.total_deposited,
  ub.total_withdrawn,
  ub.total_wagered,
  ub.total_won,
  (ub.total_deposited - ub.total_withdrawn) as net_deposits,
  (ub.total_won - ub.total_wagered) as net_gaming_profit
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id;

-- View: user_level_progress_view
CREATE OR REPLACE VIEW user_level_progress_view AS
SELECT
  u.id as user_id,
  u.username,
  ulp.current_points,
  ulp.total_points_earned,
  ul.name as current_level,
  ul.description as level_description,
  ul.benefits as level_benefits,
  ul.cashback_percentage,
  ulp.level_achieved_at
FROM users u
LEFT JOIN user_level_progress ulp ON u.id = ulp.user_id
LEFT JOIN user_levels ul ON ulp.level_id = ul.id;

-- View: user_kyc_status
CREATE OR REPLACE VIEW user_kyc_status AS
SELECT
  u.id as user_id,
  u.username,
  up.verification_level,
  up.is_verified,
  kd.status as kyc_status,
  kd.verified_at,
  COUNT(kd.id) as documents_submitted
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN kyc_documents kd ON u.id = kd.user_id
GROUP BY u.id, u.username, up.verification_level, up.is_verified, kd.status, kd.verified_at;

-- View: user_favorite_games
CREATE OR REPLACE VIEW user_favorite_games AS
SELECT
  u.id as user_id,
  u.username,
  g.name as game_name,
  g.provider,
  g.category,
  ugp.play_count,
  ugp.total_time_played,
  ugp.last_played_at,
  ugp.is_favorite
FROM users u
JOIN user_game_preferences ugp ON u.id = ugp.user_id
JOIN games g ON ugp.game_id = g.id
WHERE ugp.is_favorite = TRUE OR ugp.play_count > 0
ORDER BY ugp.play_count DESC, ugp.last_played_at DESC;

-- View: user_activity_summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  u.id as user_id,
  u.username,
  COUNT(ual.id) as total_actions,
  COUNT(DISTINCT DATE(ual.created_at)) as active_days,
  MAX(ual.created_at) as last_activity,
  COUNT(DISTINCT ual.action) as unique_actions,
  COUNT(CASE WHEN ual.category = 'login' THEN 1 END) as login_count,
  COUNT(CASE WHEN ual.category = 'gaming' THEN 1 END) as gaming_actions,
  COUNT(CASE WHEN ual.category = 'financial' THEN 1 END) as financial_actions
FROM users u
LEFT JOIN user_activity_logs ual ON u.id = ual.user_id
GROUP BY u.id, u.username;

-- =====================================================
-- ADD INDEXES FOR NEW TABLES
-- =====================================================

-- Payment gateway indexes
CREATE INDEX IF NOT EXISTS idx_payment_gateways_code ON payment_gateways(code);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_type ON payment_gateways(type);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_active ON payment_gateways(is_active);

-- Captcha indexes
CREATE INDEX IF NOT EXISTS idx_captcha_expires_at ON captcha(expires_at);

-- =====================================================
-- ADD TRIGGERS FOR NEW TABLES
-- =====================================================

-- Add trigger for payment_gateways (drop first if exists)
DROP TRIGGER IF EXISTS trg_set_updated_at_payment_gateways ON payment_gateways;
CREATE TRIGGER trg_set_updated_at_payment_gateways
BEFORE UPDATE ON payment_gateways
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at_game_provider_configs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on game_provider_configs
DROP TRIGGER IF EXISTS trg_set_updated_at_game_provider_configs ON game_provider_configs;
CREATE TRIGGER trg_set_updated_at_game_provider_configs
BEFORE UPDATE ON game_provider_configs
FOR EACH ROW EXECUTE FUNCTION set_updated_at_game_provider_configs();

-- =====================================================
-- SEED DATA FOR NEW TABLES
-- =====================================================

-- Add sample payment gateways
INSERT INTO payment_gateways (name, code, type, description, logo_url, website_url, supported_currencies, supported_countries, min_amount, max_amount, processing_time, fees_percentage, fees_fixed, auto_approval, requires_kyc, is_active)
VALUES 
  ('Stripe', 'stripe', 'card', 'Credit/Debit card payments', 'https://example.com/stripe-logo.png', 'https://stripe.com', ARRAY['USD', 'EUR', 'GBP'], ARRAY['US', 'CA', 'GB'], 5.00, 10000.00, 'instant', 2.9, 0.30, true, false, true),
  ('PayPal', 'paypal', 'digital_wallet', 'PayPal digital wallet', 'https://example.com/paypal-logo.png', 'https://paypal.com', ARRAY['USD', 'EUR', 'GBP'], ARRAY['US', 'CA', 'GB'], 1.00, 5000.00, 'instant', 3.5, 0.35, true, false, true),
  ('Bank Transfer', 'bank_transfer', 'bank', 'Direct bank transfer', 'https://example.com/bank-logo.png', 'https://bank.com', ARRAY['USD', 'EUR'], ARRAY['US', 'CA'], 50.00, 50000.00, '1-3 days', 0.0, 5.00, false, true, true)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (run after transaction)
-- =====================================================

-- Check if all views are created
SELECT 'Views created successfully' as status, COUNT(*) as view_count 
FROM information_schema.views 
WHERE table_schema = 'public';

-- Check if payment_gateways table has data
SELECT 'Payment gateways seeded' as status, COUNT(*) as gateway_count 
FROM payment_gateways;

-- Check if users table has is_2fa_enabled column
SELECT 'Users table updated' as status, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'users' AND column_name = 'is_2fa_enabled'
       ) THEN 'Yes' ELSE 'No' END as has_2fa_column; 