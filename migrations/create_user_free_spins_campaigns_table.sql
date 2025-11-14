-- Migration: Create user_free_spins_campaigns table
-- Purpose: Track free spins campaigns created through Innova Gaming Platform
-- Source: Challenges and Loyalty rewards system
-- Date: 2025-01-10

-- Main campaigns tracking table
CREATE TABLE IF NOT EXISTS user_free_spins_campaigns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_code VARCHAR(255) NOT NULL UNIQUE,

  -- Source tracking
  source VARCHAR(50) NOT NULL, -- 'challenge' or 'loyalty'
  source_id INTEGER NOT NULL, -- challenge_id or loyalty_shop_item_id

  -- Campaign details
  vendor VARCHAR(100) NOT NULL,
  game_id INTEGER NOT NULL,
  currency_code VARCHAR(10) NOT NULL,

  -- Free spins tracking
  freespins_total INTEGER NOT NULL,
  freespins_used INTEGER DEFAULT 0,
  freespins_remaining INTEGER NOT NULL,

  -- Bet amounts
  total_bet_amount DECIMAL(10, 2) NOT NULL,
  total_bet_used DECIMAL(10, 2) DEFAULT 0,
  total_win_amount DECIMAL(10, 2) DEFAULT 0,

  -- Campaign lifecycle
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'expired', 'cancelled'
  begins_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  activated_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  CONSTRAINT check_freespins_used CHECK (freespins_used >= 0 AND freespins_used <= freespins_total),
  CONSTRAINT check_status CHECK (status IN ('pending', 'active', 'completed', 'expired', 'cancelled')),
  CONSTRAINT check_source CHECK (source IN ('challenge', 'loyalty'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_free_spins_user_id ON user_free_spins_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_free_spins_campaign_code ON user_free_spins_campaigns(campaign_code);
CREATE INDEX IF NOT EXISTS idx_user_free_spins_status ON user_free_spins_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_user_free_spins_source ON user_free_spins_campaigns(source, source_id);
CREATE INDEX IF NOT EXISTS idx_user_free_spins_expires_at ON user_free_spins_campaigns(expires_at);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_free_spins_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_free_spins_campaigns_updated_at
  BEFORE UPDATE ON user_free_spins_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_user_free_spins_campaigns_updated_at();

-- Comments
COMMENT ON TABLE user_free_spins_campaigns IS 'Tracks free spins campaigns created through Innova Gaming Platform from challenges and loyalty rewards';
COMMENT ON COLUMN user_free_spins_campaigns.campaign_code IS 'Unique campaign code sent to Innova API';
COMMENT ON COLUMN user_free_spins_campaigns.source IS 'Origin of the campaign: challenge or loyalty reward';
COMMENT ON COLUMN user_free_spins_campaigns.source_id IS 'ID of the challenge or loyalty item that granted these spins';
COMMENT ON COLUMN user_free_spins_campaigns.freespins_used IS 'Number of free spins used (tracked via Innova callbacks)';
COMMENT ON COLUMN user_free_spins_campaigns.freespins_remaining IS 'Calculated field: freespins_total - freespins_used';
COMMENT ON COLUMN user_free_spins_campaigns.status IS 'Campaign status: pending (created), active (user started playing), completed (all spins used), expired (time limit passed), cancelled (manually cancelled)';
