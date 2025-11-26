-- =====================================================
-- COMPREHENSIVE BONUS SYSTEM MIGRATION
-- =====================================================
-- This migration creates a complete bonus system with:
-- - Dual wallet system (Main + Bonus)
-- - Multiple bonus types (deposit, coded, manual, cashback, etc.)
-- - Wagering requirements and tracking
-- - Game contribution percentages
-- - Comprehensive audit trail
-- =====================================================

-- =====================================================
-- 1. BONUS PLANS TABLE
-- =====================================================
-- Stores all bonus templates/plans created by admins
CREATE TABLE IF NOT EXISTS bonus_plans (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand_id BIGINT NOT NULL DEFAULT 1,

  -- Validity period
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  start_time TIME,
  end_time TIME,
  expiry_days INT DEFAULT 30, -- Days player has to use bonus after granting

  -- Trigger type
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'deposit', 'coded', 'coupon', 'manual', 'loyalty',
    'instant_cashback', 'scheduled_cashback', 'platform_bonus',
    'product_bonus', 'freebet', 'betslip_based', 'external_api', 'tournament_win'
  )),

  -- Deposit configuration (for trigger_type = 'deposit')
  min_deposit NUMERIC(15,2),
  max_deposit NUMERIC(15,2),
  payment_method_ids JSONB, -- Array of accepted payment method IDs

  -- Award type and amount
  award_type VARCHAR(20) NOT NULL CHECK (award_type IN ('flat_amount', 'percentage')),
  amount NUMERIC(15,2) NOT NULL, -- Fixed amount or percentage
  currency VARCHAR(3) DEFAULT 'NGN',

  -- Wagering requirements
  wager_requirement_multiplier NUMERIC(5,2) DEFAULT 0, -- e.g., 35 = 35x bonus
  wager_requirement_type VARCHAR(30) DEFAULT 'bonus' CHECK (wager_requirement_type IN ('bonus', 'bonus_plus_deposit', 'deposit')),
  wager_requirement_action VARCHAR(20) DEFAULT 'release' CHECK (wager_requirement_action IN ('release', 'forfeit')),
  is_incremental BOOLEAN DEFAULT FALSE,

  -- Game restrictions
  game_type_id BIGINT, -- NULL = all games allowed
  description TEXT,
  image_url VARCHAR(500),

  -- Flags and settings
  is_playable BOOLEAN DEFAULT TRUE,
  playable_bonus_qualifies BOOLEAN DEFAULT FALSE, -- DANGEROUS! If TRUE, can bet with bonus money for wagering
  release_playable_winnings BOOLEAN DEFAULT FALSE,
  cancel_on_withdrawal BOOLEAN DEFAULT TRUE,

  -- Limits
  max_trigger_all INT, -- Total instances that can be created
  max_trigger_per_player INT DEFAULT 1, -- Bonuses per player
  min_bonus_threshold NUMERIC(15,2),
  bonus_max_release NUMERIC(15,2), -- Max amount that can be released

  -- Bonus settings
  recurrence_type VARCHAR(20) DEFAULT 'non_recurring' CHECK (recurrence_type IN ('non_recurring', 'daily', 'weekly', 'monthly')),
  allow_sportsbook BOOLEAN DEFAULT FALSE,
  allow_poker BOOLEAN DEFAULT FALSE,
  additional_award BOOLEAN DEFAULT FALSE,

  -- For CODED/COUPON type
  bonus_code VARCHAR(50) UNIQUE,
  max_code_usage INT,
  current_code_usage INT DEFAULT 0,

  -- For LOYALTY type
  loyalty_points_required INT,
  vip_level_required INT,

  -- For CASHBACK type
  cashback_percentage NUMERIC(5,2),
  cashback_calculation_period VARCHAR(20) CHECK (cashback_calculation_period IN ('daily', 'weekly', 'monthly')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT, -- Admin user ID

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired'))
);

CREATE INDEX idx_bonus_plans_brand_id ON bonus_plans(brand_id);
CREATE INDEX idx_bonus_plans_trigger_type ON bonus_plans(trigger_type);
CREATE INDEX idx_bonus_plans_dates ON bonus_plans(start_date, end_date);
CREATE INDEX idx_bonus_plans_bonus_code ON bonus_plans(bonus_code);
CREATE INDEX idx_bonus_plans_status ON bonus_plans(status);

-- =====================================================
-- 2. BONUS INSTANCES TABLE
-- =====================================================
-- Each bonus granted to a player becomes an instance
CREATE TABLE IF NOT EXISTS bonus_instances (
  id BIGSERIAL PRIMARY KEY,
  bonus_plan_id BIGINT NOT NULL REFERENCES bonus_plans(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Amounts
  bonus_amount NUMERIC(15,2) NOT NULL, -- Granted bonus amount
  remaining_bonus NUMERIC(15,2) NOT NULL, -- Remaining in bonus wallet

  -- For deposit bonuses
  deposit_amount NUMERIC(15,2),
  deposit_transaction_id BIGINT,

  -- Wagering
  wager_requirement_amount NUMERIC(15,2) NOT NULL, -- Total amount to wager
  wager_progress_amount NUMERIC(15,2) DEFAULT 0, -- Wagered so far
  wager_percentage_complete NUMERIC(5,2) DEFAULT 0, -- Percentage 0-100%

  -- Status and dates
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Just granted, not activated
    'active',     -- Active, can be used
    'wagering',   -- In wagering process
    'completed',  -- Wagering completed, money released
    'expired',    -- Expired before completion
    'forfeited',  -- Lost (withdrawal, rule violation)
    'cancelled'   -- Manually cancelled
  )),

  granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- For CODED bonuses
  code_used VARCHAR(50),

  -- Metadata
  notes TEXT, -- For manual bonuses
  granted_by BIGINT, -- Admin ID for manual bonuses

  -- Tracking
  games_played JSONB, -- Array of game_ids played with this bonus
  total_bets_count INT DEFAULT 0,
  total_wins_amount NUMERIC(15,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bonus_instances_player_id ON bonus_instances(player_id);
CREATE INDEX idx_bonus_instances_status ON bonus_instances(status);
CREATE INDEX idx_bonus_instances_expires_at ON bonus_instances(expires_at);
CREATE INDEX idx_bonus_instances_bonus_plan ON bonus_instances(bonus_plan_id);
CREATE INDEX idx_bonus_instances_player_status ON bonus_instances(player_id, status);

-- =====================================================
-- 3. BONUS WALLETS TABLE
-- =====================================================
-- Each player has a separate bonus wallet from main wallet
CREATE TABLE IF NOT EXISTS bonus_wallets (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Balances
  total_bonus_balance NUMERIC(15,2) DEFAULT 0, -- Total bonus money available
  locked_bonus_balance NUMERIC(15,2) DEFAULT 0, -- Locked in active bonuses
  playable_bonus_balance NUMERIC(15,2) DEFAULT 0, -- Available for play

  -- Tracking
  total_bonus_received NUMERIC(15,2) DEFAULT 0, -- Lifetime bonuses received
  total_bonus_wagered NUMERIC(15,2) DEFAULT 0, -- Lifetime wagered with bonus
  total_bonus_released NUMERIC(15,2) DEFAULT 0, -- Lifetime released to main wallet
  total_bonus_forfeited NUMERIC(15,2) DEFAULT 0, -- Lifetime forfeited

  -- Active bonuses
  active_bonus_count INT DEFAULT 0,

  currency VARCHAR(3) DEFAULT 'NGN',

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bonus_wallets_player_id ON bonus_wallets(player_id);

-- =====================================================
-- 4. BONUS TRANSACTIONS TABLE
-- =====================================================
-- All bonus money movements for audit
CREATE TABLE IF NOT EXISTS bonus_transactions (
  id BIGSERIAL PRIMARY KEY,
  bonus_instance_id BIGINT NOT NULL REFERENCES bonus_instances(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
    'granted',           -- Bonus granted
    'activated',         -- Bonus activated
    'bet_placed',        -- Bet placed with bonus
    'bet_won',           -- Bet won
    'bet_lost',          -- Bet lost
    'wager_contributed', -- Contribution to wagering
    'released',          -- Money released to main wallet
    'forfeited',         -- Bonus forfeited
    'expired',           -- Bonus expired
    'cancelled',         -- Cancelled
    'adjusted'           -- Manual adjustment
  )),

  -- Amounts
  amount NUMERIC(15,2) NOT NULL,
  balance_before NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2) NOT NULL,

  -- Context
  game_id BIGINT, -- Related game
  bet_id BIGINT, -- Related bet
  wager_contribution NUMERIC(15,2), -- Wagering contribution

  description TEXT,
  metadata JSONB, -- Additional data in JSON format

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bonus_transactions_bonus_instance ON bonus_transactions(bonus_instance_id);
CREATE INDEX idx_bonus_transactions_player_id ON bonus_transactions(player_id);
CREATE INDEX idx_bonus_transactions_type ON bonus_transactions(transaction_type);
CREATE INDEX idx_bonus_transactions_created_at ON bonus_transactions(created_at);

-- =====================================================
-- 5. BONUS WAGER PROGRESS TABLE
-- =====================================================
-- Detailed wagering progress tracking for each active bonus
CREATE TABLE IF NOT EXISTS bonus_wager_progress (
  id BIGSERIAL PRIMARY KEY,
  bonus_instance_id BIGINT NOT NULL REFERENCES bonus_instances(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Progress
  required_wager_amount NUMERIC(15,2) NOT NULL,
  current_wager_amount NUMERIC(15,2) DEFAULT 0,
  remaining_wager_amount NUMERIC(15,2) NOT NULL,
  completion_percentage NUMERIC(5,2) DEFAULT 0,

  -- Breakdown by game categories
  slots_contribution NUMERIC(15,2) DEFAULT 0,
  table_games_contribution NUMERIC(15,2) DEFAULT 0,
  live_casino_contribution NUMERIC(15,2) DEFAULT 0,
  other_games_contribution NUMERIC(15,2) DEFAULT 0,

  -- Tracking
  total_bets_count INT DEFAULT 0,
  last_bet_at TIMESTAMPTZ,

  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_bonus_wager_progress_bonus_instance ON bonus_wager_progress(bonus_instance_id);
CREATE INDEX idx_bonus_wager_progress_player_id ON bonus_wager_progress(player_id);

-- =====================================================
-- 6. GAME CONTRIBUTIONS TABLE
-- =====================================================
-- Defines wagering contribution percentage for each game
CREATE TABLE IF NOT EXISTS game_contributions (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  game_category VARCHAR(50) NOT NULL CHECK (game_category IN ('slots', 'table_games', 'live_casino', 'video_poker', 'other')),

  -- Contribution to wagering (%)
  wagering_contribution_percentage NUMERIC(5,2) DEFAULT 100.00,
  -- 100% = contributes fully
  -- 50% = contributes half
  -- 0% = doesn't contribute

  -- Restrictions
  is_restricted BOOLEAN DEFAULT FALSE, -- If TRUE, game can't be played with bonus

  -- Metadata
  game_name VARCHAR(255),
  provider VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(game_id)
);

CREATE INDEX idx_game_contributions_game_id ON game_contributions(game_id);
CREATE INDEX idx_game_contributions_game_category ON game_contributions(game_category);

-- =====================================================
-- 7. BONUS RESTRICTIONS TABLE
-- =====================================================
-- Specific restrictions for each bonus plan
CREATE TABLE IF NOT EXISTS bonus_restrictions (
  id BIGSERIAL PRIMARY KEY,
  bonus_plan_id BIGINT NOT NULL REFERENCES bonus_plans(id) ON DELETE CASCADE,

  restriction_type VARCHAR(50) NOT NULL CHECK (restriction_type IN (
    'country',
    'game',
    'game_exclusion',
    'affiliate',
    'user',
    'vip_level',
    'player_tag_include',
    'player_tag_exclude',
    'bonus_plan_exclusion'
  )),

  restriction_value VARCHAR(255) NOT NULL, -- ID or code of restriction

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bonus_restrictions_bonus_plan ON bonus_restrictions(bonus_plan_id);
CREATE INDEX idx_bonus_restrictions_type ON bonus_restrictions(restriction_type);

-- =====================================================
-- 8. BONUS AUDIT LOG TABLE
-- =====================================================
-- Complete audit trail for debugging and compliance
CREATE TABLE IF NOT EXISTS bonus_audit_log (
  id BIGSERIAL PRIMARY KEY,

  -- Context
  bonus_plan_id BIGINT,
  bonus_instance_id BIGINT,
  player_id BIGINT,
  admin_user_id BIGINT,

  -- Action
  action_type VARCHAR(50) NOT NULL, -- 'created', 'granted', 'forfeited', etc.
  action_description TEXT,

  -- Data
  old_value JSONB, -- Old value (for modifications)
  new_value JSONB, -- New value

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bonus_audit_log_bonus_plan ON bonus_audit_log(bonus_plan_id);
CREATE INDEX idx_bonus_audit_log_bonus_instance ON bonus_audit_log(bonus_instance_id);
CREATE INDEX idx_bonus_audit_log_player ON bonus_audit_log(player_id);
CREATE INDEX idx_bonus_audit_log_action_type ON bonus_audit_log(action_type);
CREATE INDEX idx_bonus_audit_log_created_at ON bonus_audit_log(created_at);

-- =====================================================
-- DEFAULT GAME CONTRIBUTIONS
-- =====================================================
-- Set default contributions for existing games
-- Slots: 100%, Table Games: 10-20%, Live Casino: 10-20%

-- This will be populated after games are synced
-- Admin can override these values via API

COMMENT ON TABLE bonus_plans IS 'Bonus plan templates created by admins';
COMMENT ON TABLE bonus_instances IS 'Active bonuses granted to players';
COMMENT ON TABLE bonus_wallets IS 'Player bonus wallets separate from main balance';
COMMENT ON TABLE bonus_transactions IS 'Audit trail of all bonus money movements';
COMMENT ON TABLE bonus_wager_progress IS 'Detailed wagering progress tracking';
COMMENT ON TABLE game_contributions IS 'Wagering contribution percentages per game';
COMMENT ON TABLE bonus_restrictions IS 'Bonus eligibility restrictions';
COMMENT ON TABLE bonus_audit_log IS 'Complete audit log for compliance';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run migration: psql -U postgres -d jackpotx-db -f migration-bonus-system.sql
-- 2. Populate game_contributions for existing games
-- 3. Create initial bonus plans via Admin API
-- =====================================================
