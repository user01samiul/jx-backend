-- =====================================================
-- COMPLETE CASINO PLATFORM DATABASE SCHEMA (FIXED)
-- =====================================================
-- This script creates a comprehensive casino platform database
-- with detailed user profiles, gaming analytics, and KYC management

BEGIN;

-- =====================================================
-- DROP SECTION (clean reset)
-- =====================================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS trg_set_updated_at_statuses ON statuses;
DROP TRIGGER IF EXISTS trg_set_updated_at_roles ON roles;
DROP TRIGGER IF EXISTS trg_set_updated_at_users ON users;
DROP TRIGGER IF EXISTS trg_set_updated_at_user_roles ON user_roles;
DROP TRIGGER IF EXISTS trg_set_updated_at_tokens ON tokens;
DROP TRIGGER IF EXISTS trg_set_updated_at_games ON games;
DROP TRIGGER IF EXISTS trg_set_updated_at_user_profiles ON user_profiles;
DROP TRIGGER IF EXISTS trg_set_updated_at_kyc_documents ON kyc_documents;
DROP TRIGGER IF EXISTS trg_set_updated_at_user_levels ON user_levels;
DROP TRIGGER IF EXISTS trg_set_updated_at_promotions ON promotions;
DROP TRIGGER IF EXISTS trg_set_updated_at_user_promotions ON user_promotions;
DROP TRIGGER IF EXISTS trg_set_updated_at_user_balances ON user_balances;
DROP TRIGGER IF EXISTS trg_set_updated_at_user_sessions ON user_sessions;
DROP TRIGGER IF EXISTS trg_set_updated_at_user_activity_logs ON user_activity_logs;
DROP TRIGGER IF EXISTS trg_set_updated_at_user_game_preferences ON user_game_preferences;

-- Drop trigger function
DROP FUNCTION IF EXISTS set_updated_at;

-- Drop views
DROP VIEW IF EXISTS daily_user_bet_summary;
DROP VIEW IF EXISTS transaction_summary_by_type;
DROP VIEW IF EXISTS user_gaming_analytics;
DROP VIEW IF EXISTS user_financial_summary;
DROP VIEW IF EXISTS user_level_progress_view;
DROP VIEW IF EXISTS user_kyc_status;
DROP VIEW IF EXISTS user_favorite_games;
DROP VIEW IF EXISTS user_activity_summary;

-- Drop tables (reverse dependency order)
DROP TABLE IF EXISTS user_game_preferences;
DROP TABLE IF EXISTS user_activity_logs;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS user_balances;
DROP TABLE IF EXISTS user_promotions;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS user_level_progress;
DROP TABLE IF EXISTS user_levels;
DROP TABLE IF EXISTS kyc_documents;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS bets;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS statuses;

-- =====================================================
-- CREATE SECTION (schema setup)
-- =====================================================

-- Create audit trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Create table: statuses
CREATE TABLE statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: roles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: users (extended)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  auth_secret VARCHAR(100),
  qr_code TEXT,
  is_2fa_enabled BOOLEAN DEFAULT FALSE,
  status_id INTEGER REFERENCES statuses(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: user_roles
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: tokens
CREATE TABLE tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expired_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- =====================================================
-- USER PROFILE & KYC TABLES
-- =====================================================

-- Create table: user_profiles (extended user information)
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  nationality VARCHAR(100),
  country VARCHAR(100),
  city VARCHAR(100),
  address TEXT,
  postal_code VARCHAR(20),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  avatar_url TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  currency VARCHAR(3) DEFAULT 'USD',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_level INTEGER DEFAULT 0, -- 0=unverified, 1=basic, 2=full
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: kyc_documents (KYC verification)
CREATE TABLE kyc_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement')),
  document_number VARCHAR(100),
  document_url TEXT,
  front_image_url TEXT,
  back_image_url TEXT,
  selfie_image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- =====================================================
-- USER LEVELS & LOYALTY SYSTEM
-- =====================================================

-- Create table: user_levels (VIP levels)
CREATE TABLE user_levels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  benefits TEXT[],
  cashback_percentage NUMERIC(5,2) DEFAULT 0,
  withdrawal_limit NUMERIC(20,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: user_level_progress
CREATE TABLE user_level_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  level_id INTEGER REFERENCES user_levels(id),
  current_points INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  level_achieved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- =====================================================
-- PROMOTIONS & BONUSES
-- =====================================================

-- Create table: promotions
CREATE TABLE promotions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('welcome_bonus', 'deposit_bonus', 'free_spins', 'cashback', 'reload_bonus', 'tournament')),
  bonus_percentage NUMERIC(5,2),
  max_bonus_amount NUMERIC(20,2),
  min_deposit_amount NUMERIC(20,2),
  wagering_requirement NUMERIC(10,2),
  free_spins_count INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: user_promotions (promotions claimed by users)
CREATE TABLE user_promotions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  promotion_id INTEGER REFERENCES promotions(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  claimed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  bonus_amount NUMERIC(20,2),
  wagering_completed NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- =====================================================
-- GAMING TABLES
-- =====================================================

-- Create table: games
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  subcategory VARCHAR(50),
  image_url TEXT,
  thumbnail_url TEXT,
  game_code VARCHAR(50) UNIQUE,
  rtp_percentage NUMERIC(5,2),
  volatility VARCHAR(20) CHECK (volatility IN ('low', 'medium', 'high')),
  min_bet NUMERIC(10,2),
  max_bet NUMERIC(20,2),
  max_win NUMERIC(20,2),
  is_featured BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_hot BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: user_game_preferences (favorite games)
CREATE TABLE user_game_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  is_favorite BOOLEAN DEFAULT FALSE,
  play_count INTEGER DEFAULT 0,
  total_time_played INTEGER DEFAULT 0, -- in seconds
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1,
  UNIQUE(user_id, game_id)
);

-- =====================================================
-- FINANCIAL TABLES
-- =====================================================

-- Create table: user_balances
CREATE TABLE user_balances (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  balance NUMERIC(20,2) NOT NULL DEFAULT 0,
  bonus_balance NUMERIC(20,2) DEFAULT 0,
  locked_balance NUMERIC(20,2) DEFAULT 0,
  total_deposited NUMERIC(20,2) DEFAULT 0,
  total_withdrawn NUMERIC(20,2) DEFAULT 0,
  total_wagered NUMERIC(20,2) DEFAULT 0,
  total_won NUMERIC(20,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create table: transactions
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(20) CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'bonus', 'cashback', 'refund', 'adjustment')),
  amount NUMERIC(20,2) NOT NULL,
  balance_before NUMERIC(20,2),
  balance_after NUMERIC(20,2),
  currency VARCHAR(3) DEFAULT 'USD',
  reference_id TEXT,
  external_reference TEXT,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1
);

-- Create table: bets
CREATE TABLE bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  transaction_id INTEGER REFERENCES transactions(id),
  bet_amount NUMERIC(20, 2) NOT NULL,
  win_amount NUMERIC(20, 2) DEFAULT 0,
  multiplier NUMERIC(10, 2),
  outcome VARCHAR(20) CHECK (outcome IN ('win', 'lose', 'pending', 'cancelled')),
  game_data JSONB, -- store game-specific data
  placed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  result_at TIMESTAMPTZ,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1
);

-- =====================================================
-- SESSION & ACTIVITY TABLES
-- =====================================================

-- Create table: user_sessions
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_id TEXT UNIQUE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100),
  login_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Create table: user_activity_logs (detailed user actions)
CREATE TABLE user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Create triggers for updated_at
CREATE TRIGGER trg_set_updated_at_statuses
BEFORE UPDATE ON statuses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_roles
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_user_roles
BEFORE UPDATE ON user_roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_tokens
BEFORE UPDATE ON tokens
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_games
BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_user_profiles
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_kyc_documents
BEFORE UPDATE ON kyc_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_user_levels
BEFORE UPDATE ON user_levels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_promotions
BEFORE UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_user_promotions
BEFORE UPDATE ON user_promotions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_user_balances
BEFORE UPDATE ON user_balances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_user_sessions
BEFORE UPDATE ON user_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_user_activity_logs
BEFORE UPDATE ON user_activity_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_set_updated_at_user_game_preferences
BEFORE UPDATE ON user_game_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- INDEXES
-- =====================================================

-- Core indexes
CREATE INDEX idx_tokens_access_token ON tokens(access_token);
CREATE UNIQUE INDEX idx_tokens_refresh_token ON tokens(refresh_token);
CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_tokens_expired_at ON tokens(expired_at);

-- User profile indexes
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone_number);
CREATE INDEX idx_user_profiles_nationality ON user_profiles(nationality);
CREATE INDEX idx_user_profiles_country ON user_profiles(country);
CREATE INDEX idx_user_profiles_verification_level ON user_profiles(verification_level);

-- KYC indexes
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);
CREATE INDEX idx_kyc_documents_type ON kyc_documents(document_type);

-- Gaming indexes
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_game_id ON bets(game_id);
CREATE INDEX idx_bets_placed_at ON bets(placed_at);
CREATE INDEX idx_bets_outcome ON bets(outcome);
CREATE INDEX idx_user_game_preferences_user_id ON user_game_preferences(user_id);
CREATE INDEX idx_user_game_preferences_favorite ON user_game_preferences(is_favorite);
CREATE INDEX idx_games_provider ON games(provider);
CREATE INDEX idx_games_category ON games(category);
CREATE INDEX idx_games_active ON games(is_active);

-- Financial indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_user_balances_balance ON user_balances(balance);

-- Session indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_ip ON user_sessions(ip_address);

-- Activity indexes
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Level and promotion indexes
CREATE INDEX idx_user_level_progress_user_id ON user_level_progress(user_id);
CREATE INDEX idx_user_promotions_user_id ON user_promotions(user_id);
CREATE INDEX idx_user_promotions_status ON user_promotions(status);

-- Create index: transactions external_reference
CREATE INDEX idx_transactions_external_reference ON transactions(external_reference);

-- =====================================================
-- VIEWS & REPORTS
-- =====================================================

-- View: daily_user_bet_summary
CREATE OR REPLACE VIEW daily_user_bet_summary AS
SELECT
  user_id,
  DATE(placed_at) as bet_date,
  COUNT(*) as total_bets,
  SUM(bet_amount) as total_amount,
  SUM(win_amount) as total_win,
  SUM(win_amount) - SUM(bet_amount) as net_profit,
  AVG(bet_amount) as avg_bet_amount
FROM bets
GROUP BY user_id, DATE(placed_at);

-- View: transaction_summary_by_type
CREATE OR REPLACE VIEW transaction_summary_by_type AS
SELECT
  user_id,
  type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM transactions
GROUP BY user_id, type;

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

-- View: user_level_progress_view (renamed to avoid conflict)
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
-- SEED DATA
-- =====================================================

-- Seed data for statuses
INSERT INTO statuses (name, description)
VALUES 
  ('Active', 'Can log in and use the system'),
  ('Inactive', 'Disabled or deleted user'),
  ('Suspended', 'Temporarily suspended'),
  ('Banned', 'Permanently banned');

-- Seed data for roles
INSERT INTO roles (name, description)
VALUES
  ('Admin', 'Full access to the system'),
  ('Player', 'End-user or customer'),
  ('Support', 'Support team member'),
  ('Accountant', 'Handles finances and reports'),
  ('Developer', 'Developer or technical team'),
  ('Manager', 'Casino manager'),
  ('Moderator', 'Content and user moderator');

-- Seed data for user levels
INSERT INTO user_levels (name, description, min_points, max_points, benefits, cashback_percentage, withdrawal_limit)
VALUES
  ('Bronze', 'New player level', 0, 999, ARRAY['Welcome bonus', 'Basic support'], 0.5, 1000),
  ('Silver', 'Regular player', 1000, 4999, ARRAY['Monthly bonus', 'Priority support', 'Faster withdrawals'], 1.0, 5000),
  ('Gold', 'Active player', 5000, 19999, ARRAY['Weekly bonus', 'VIP support', 'Exclusive games', 'Higher limits'], 2.0, 10000),
  ('Platinum', 'High roller', 20000, 99999, ARRAY['Daily bonus', 'Personal account manager', 'Exclusive tournaments'], 3.0, 50000),
  ('Diamond', 'VIP player', 100000, NULL, ARRAY['Custom bonuses', '24/7 support', 'Private events', 'Luxury rewards'], 5.0, 100000);

-- Seed data for games
INSERT INTO games (name, provider, category, subcategory, game_code, rtp_percentage, volatility, min_bet, max_bet, max_win, is_featured, is_new)
VALUES
  ('Book of Dead', 'Play''n GO', 'Slots', 'Adventure', 'book_of_dead', 96.21, 'high', 0.10, 100.00, 500000, TRUE, FALSE),
  ('Starburst', 'NetEnt', 'Slots', 'Fruit', 'starburst', 96.09, 'low', 0.10, 100.00, 50000, TRUE, FALSE),
  ('Gonzo''s Quest', 'NetEnt', 'Slots', 'Adventure', 'gonzos_quest', 95.97, 'medium', 0.20, 200.00, 2500000, FALSE, FALSE),
  ('Blackjack Classic', 'Evolution Gaming', 'Table Games', 'Blackjack', 'blackjack_classic', 99.50, 'low', 1.00, 1000.00, 100000, FALSE, FALSE),
  ('Roulette European', 'Evolution Gaming', 'Table Games', 'Roulette', 'roulette_european', 97.30, 'medium', 0.10, 5000.00, 500000, FALSE, FALSE),
  ('Crazy Monkey', 'Igrosoft', 'Slots', 'Fruit', 'crazy_monkey', 95.00, 'high', 0.01, 50.00, 100000, FALSE, TRUE);

-- Seed data for promotions
INSERT INTO promotions (name, description, type, bonus_percentage, max_bonus_amount, min_deposit_amount, wagering_requirement, free_spins_count, start_date, end_date)
VALUES
  ('Welcome Bonus', 'Get 100% bonus on your first deposit', 'welcome_bonus', 100.00, 500.00, 20.00, 35.00, 50, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year'),
  ('Reload Bonus', 'Get 50% bonus on your deposit', 'reload_bonus', 50.00, 200.00, 10.00, 25.00, 25, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year'),
  ('Free Spins Friday', 'Get 100 free spins every Friday', 'free_spins', NULL, NULL, 50.00, 20.00, 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year'),
  ('Cashback Weekend', 'Get 10% cashback on weekend losses', 'cashback', 10.00, 100.00, NULL, NULL, NULL, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year');

-- Seed admin user (with hashed password)
INSERT INTO users (username, email, password, status_id)
SELECT
  'admin',
  'admin@casino.com',
  '$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq',  -- bcrypt('secret123')
  id
FROM statuses
WHERE name = 'Active';

-- Assign Admin role to admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'Admin';

-- Create initial balance for admin
INSERT INTO user_balances (user_id, balance)
SELECT id, 10000.00
FROM users
WHERE username = 'admin';

-- Create admin profile
INSERT INTO user_profiles (user_id, first_name, last_name, phone_number, nationality, country, is_verified, verification_level)
SELECT 
  id,
  'Admin',
  'User',
  '+1234567890',
  'United States',
  'United States',
  TRUE,
  2
FROM users
WHERE username = 'admin';

-- Assign Bronze level to admin
INSERT INTO user_level_progress (user_id, level_id, current_points, total_points_earned)
SELECT 
  u.id,
  ul.id,
  0,
  0
FROM users u, user_levels ul
WHERE u.username = 'admin' AND ul.name = 'Bronze';

COMMIT;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

BEGIN;

-- Create sample players
INSERT INTO users (username, email, password, status_id)
SELECT
  'player1',
  'player1@example.com',
  '$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq',
  id
FROM statuses
WHERE name = 'Active';

INSERT INTO users (username, email, password, status_id)
SELECT
  'player2',
  'player2@example.com',
  '$2b$10$YQRnR/9U2NCOUFPnMT.JJ.SVi/Di4S5hzAgt0/4f3neMfmULWUKYq',
  id
FROM statuses
WHERE name = 'Active';

-- Assign Player role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username IN ('player1', 'player2') AND r.name = 'Player';

-- Create player profiles
INSERT INTO user_profiles (user_id, first_name, last_name, phone_number, nationality, country, is_verified, verification_level)
SELECT 
  id,
  'John',
  'Doe',
  '+1234567891',
  'United States',
  'United States',
  TRUE,
  1
FROM users
WHERE username = 'player1';

INSERT INTO user_profiles (user_id, first_name, last_name, phone_number, nationality, country, is_verified, verification_level)
SELECT 
  id,
  'Jane',
  'Smith',
  '+1234567892',
  'Canada',
  'Canada',
  FALSE,
  0
FROM users
WHERE username = 'player2';

-- Create balances
INSERT INTO user_balances (user_id, balance, total_deposited, total_wagered, total_won)
SELECT id, 500.00, 1000.00, 800.00, 1200.00
FROM users
WHERE username = 'player1';

INSERT INTO user_balances (user_id, balance, total_deposited, total_wagered, total_won)
SELECT id, 200.00, 500.00, 300.00, 400.00
FROM users
WHERE username = 'player2';

-- Assign levels
INSERT INTO user_level_progress (user_id, level_id, current_points, total_points_earned)
SELECT 
  u.id,
  ul.id,
  1500,
  1500
FROM users u, user_levels ul
WHERE u.username = 'player1' AND ul.name = 'Silver';

INSERT INTO user_level_progress (user_id, level_id, current_points, total_points_earned)
SELECT 
  u.id,
  ul.id,
  500,
  500
FROM users u, user_levels ul
WHERE u.username = 'player2' AND ul.name = 'Bronze';

-- Sample transactions
INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, status, description)
SELECT 
  u.id,
  'deposit',
  100.00,
  0.00,
  100.00,
  'completed',
  'Initial deposit'
FROM users u
WHERE u.username = 'player1';

-- Sample bets
INSERT INTO bets (user_id, game_id, bet_amount, win_amount, outcome, placed_at)
SELECT 
  u.id,
  g.id,
  10.00,
  15.00,
  'win',
  CURRENT_TIMESTAMP - INTERVAL '1 hour'
FROM users u, games g
WHERE u.username = 'player1' AND g.name = 'Book of Dead';

-- Sample activity logs
INSERT INTO user_activity_logs (user_id, action, category, description, ip_address)
SELECT 
  u.id,
  'login',
  'authentication',
  'User logged in successfully',
  '192.168.1.1'
FROM users u
WHERE u.username = 'player1';

INSERT INTO user_activity_logs (user_id, action, category, description, ip_address)
SELECT 
  u.id,
  'place_bet',
  'gaming',
  'Placed bet on Book of Dead',
  '192.168.1.1'
FROM users u
WHERE u.username = 'player1';

COMMIT;
