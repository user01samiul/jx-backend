-- =====================================================
-- Create Campaigns Master Table
-- =====================================================
-- This migration creates a master campaigns table to store
-- campaign metadata independently from user assignments.
-- This allows admins to create campaigns first, then add
-- users later without dependency issues.
-- =====================================================

-- Create campaigns master table
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  campaign_code VARCHAR(255) UNIQUE NOT NULL,
  vendor VARCHAR(100) NOT NULL,
  currency_code VARCHAR(10) DEFAULT 'USD',
  freespins_per_player INTEGER NOT NULL DEFAULT 10,
  begins_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),

  -- Game configuration (JSON to support multiple games)
  games JSONB NOT NULL,

  -- Optional metadata
  description TEXT,
  notes TEXT,

  -- Constraints
  CONSTRAINT campaigns_dates_check CHECK (expires_at > begins_at)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_code ON campaigns(campaign_code);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(begins_at, expires_at);

-- Add comments for documentation
COMMENT ON TABLE campaigns IS 'Master table storing campaign templates/metadata';
COMMENT ON COLUMN campaigns.campaign_code IS 'Unique campaign identifier used across system';
COMMENT ON COLUMN campaigns.games IS 'JSON array of game configurations [{game_id, total_bet}, ...]';
COMMENT ON COLUMN campaigns.status IS 'Campaign status: active, cancelled, expired';

SELECT 'Campaigns master table created successfully!' as result;
