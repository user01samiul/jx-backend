-- Migration: Create KYC Free Spins Campaign System
-- Date: 2025-11-09
-- Description: Implements campaign eligibility tracking for KYC verification free spins using Innova Gaming Platform API

-- ============================================================
-- TABLE: kyc_free_spins_campaigns
-- ============================================================
-- Tracks campaign eligibility for users who complete KYC verification
-- The operator (JackpotX) does NOT directly grant free spins
-- Instead, this table tracks eligibility that Innova's platform will use
-- to activate free spins when the user launches the game

CREATE TABLE IF NOT EXISTS kyc_free_spins_campaigns (
  id SERIAL PRIMARY KEY,

  -- User Reference
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Campaign Details
  campaign_code VARCHAR(100) NOT NULL DEFAULT 'KYC_VERIFICATION_100_SPINS',
  game_id INTEGER NOT NULL, -- Which game the free spins are for (20 Super Hot Clover Chance)

  -- Free Spins Configuration
  spins_total INTEGER NOT NULL DEFAULT 100,
  spin_value DECIMAL(10,2) NOT NULL DEFAULT 0.20, -- $0.20 USD per spin
  total_value DECIMAL(10,2) NOT NULL DEFAULT 20.00, -- 100 spins × $0.20 = $20 total value

  -- Timestamps
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When eligibility was granted (KYC approval)
  expires_at TIMESTAMP NOT NULL, -- Campaign expires 24 hours after granting
  activated_at TIMESTAMP NULL, -- When user first launched the game and spins activated
  completed_at TIMESTAMP NULL, -- When all spins were used

  -- Usage Tracking (updated via changebalance callbacks)
  spins_used INTEGER DEFAULT 0,
  spins_remaining INTEGER DEFAULT 100,
  total_bet_amount DECIMAL(10,2) DEFAULT 0.00, -- Total amount bet during free spins
  total_win_amount DECIMAL(10,2) DEFAULT 0.00, -- Total amount won from free spins

  -- Campaign Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'expired', 'cancelled')),
  -- pending: Eligibility created, waiting for user to launch game
  -- active: User launched game, Innova activated spins, spins in progress
  -- completed: All spins used, bonus credited
  -- expired: 24 hours passed without activation or completion
  -- cancelled: Campaign cancelled (e.g., user requested exclusion)

  -- Bonus Conversion
  bonus_credited BOOLEAN DEFAULT FALSE, -- Whether winnings were converted to bonus
  user_promotion_id INTEGER NULL REFERENCES user_promotions(id) ON DELETE SET NULL,
  -- Links to the bonus created from free spin winnings

  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(user_id), -- One campaign per user (KYC verification is one-time)
  CHECK (spins_used >= 0 AND spins_used <= spins_total),
  CHECK (spins_remaining >= 0 AND spins_remaining <= spins_total),
  CHECK (spins_used + spins_remaining = spins_total),
  CHECK (total_bet_amount >= 0.00),
  CHECK (total_win_amount >= 0.00),
  CHECK (spin_value > 0.00),
  CHECK (total_value > 0.00)
);

-- ============================================================
-- INDEXES for Performance
-- ============================================================

CREATE INDEX idx_kyc_campaigns_user_id ON kyc_free_spins_campaigns(user_id);
CREATE INDEX idx_kyc_campaigns_campaign_code ON kyc_free_spins_campaigns(campaign_code);
CREATE INDEX idx_kyc_campaigns_status ON kyc_free_spins_campaigns(status);
CREATE INDEX idx_kyc_campaigns_expires_at ON kyc_free_spins_campaigns(expires_at);
CREATE INDEX idx_kyc_campaigns_user_campaign ON kyc_free_spins_campaigns(user_id, campaign_code);

-- ============================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_kyc_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kyc_campaigns_updated_at
  BEFORE UPDATE ON kyc_free_spins_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_campaigns_updated_at();

-- ============================================================
-- COMMENTS for Documentation
-- ============================================================

COMMENT ON TABLE kyc_free_spins_campaigns IS 'Tracks campaign eligibility for KYC verification free spins. Operator does not grant spins directly - Innova platform activates spins when user launches game with campaign info.';

COMMENT ON COLUMN kyc_free_spins_campaigns.campaign_code IS 'Unique campaign identifier sent to Innova in game launch token and received back in changebalance callbacks';

COMMENT ON COLUMN kyc_free_spins_campaigns.spins_used IS 'Updated via changebalance callbacks from Innova with context.campaign_details.remaining_spins';

COMMENT ON COLUMN kyc_free_spins_campaigns.total_win_amount IS 'Accumulated from changebalance WIN callbacks with context.reason = "PROMO-FREESPIN"';

COMMENT ON COLUMN kyc_free_spins_campaigns.status IS 'pending = awaiting activation | active = spins in progress | completed = all spins used | expired = timeout | cancelled = manually cancelled';

COMMENT ON COLUMN kyc_free_spins_campaigns.user_promotion_id IS 'Links to bonus created from free spin winnings with 40x wagering requirement';

-- ============================================================
-- SAMPLE DATA for Testing (Optional - Remove in production)
-- ============================================================

-- Example: Grant KYC campaign to user_id 72 for game_id 5755 (20 Super Hot Clover Chance)
-- INSERT INTO kyc_free_spins_campaigns (
--   user_id,
--   campaign_code,
--   game_id,
--   spins_total,
--   spin_value,
--   total_value,
--   granted_at,
--   expires_at,
--   spins_remaining,
--   status
-- ) VALUES (
--   72,
--   'KYC_VERIFICATION_100_SPINS',
--   5755,
--   100,
--   0.20,
--   20.00,
--   CURRENT_TIMESTAMP,
--   CURRENT_TIMESTAMP + INTERVAL '24 hours',
--   100,
--   'pending'
-- );

-- ============================================================
-- END OF MIGRATION
-- ============================================================
