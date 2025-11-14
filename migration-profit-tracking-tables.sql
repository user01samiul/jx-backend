-- Migration: Create profit tracking tables for hidden RTP control
-- This enables the profit control system to track and adjust RTP automatically

-- Table to track individual profit adjustments
CREATE TABLE IF NOT EXISTS profit_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  original_amount NUMERIC(10,2) NOT NULL,
  adjusted_amount NUMERIC(10,2) NOT NULL,
  profit_reduction NUMERIC(10,2) NOT NULL,
  effective_rtp NUMERIC(5,2) NOT NULL,
  provider_rtp NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for daily profit summaries (for auto-adjustment calculations)
CREATE TABLE IF NOT EXISTS daily_profit_summary (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_bets NUMERIC(15,2) DEFAULT 0,
  total_wins NUMERIC(15,2) DEFAULT 0,
  total_adjusted_wins NUMERIC(15,2) DEFAULT 0,
  total_profit_retained NUMERIC(15,2) DEFAULT 0,
  effective_rtp NUMERIC(5,2) DEFAULT 80.00,
  target_profit NUMERIC(5,2) DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table to log RTP adjustments for audit trail
CREATE TABLE IF NOT EXISTS rtp_adjustment_log (
  id SERIAL PRIMARY KEY,
  previous_rtp NUMERIC(5,2) NOT NULL,
  new_rtp NUMERIC(5,2) NOT NULL,
  adjustment NUMERIC(5,2) NOT NULL,
  reason TEXT NOT NULL,
  profit_gap NUMERIC(5,2),
  actual_profit NUMERIC(5,2),
  target_profit NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profit_tracking_user_id ON profit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_game_id ON profit_tracking(game_id);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_created_at ON profit_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_profit_summary_date ON daily_profit_summary(date);
CREATE INDEX IF NOT EXISTS idx_rtp_adjustment_log_created_at ON rtp_adjustment_log(created_at);

-- Update rtp_settings table to include adjustment_mode if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rtp_settings' AND column_name = 'adjustment_mode'
    ) THEN
        ALTER TABLE rtp_settings ADD COLUMN adjustment_mode VARCHAR(10) DEFAULT 'manual';
    END IF;
END $$;

-- Insert default RTP settings if none exist
INSERT INTO rtp_settings (target_profit_percent, effective_rtp, adjustment_mode, updated_at)
SELECT 20.00, 80.00, 'manual', NOW()
WHERE NOT EXISTS (SELECT 1 FROM rtp_settings);

-- Create view for profit analytics
CREATE OR REPLACE VIEW profit_analytics_view AS
SELECT 
  DATE(pt.created_at) as date,
  g.name as game_name,
  g.provider,
  g.category,
  COUNT(*) as transaction_count,
  SUM(pt.original_amount) as total_original_wins,
  SUM(pt.adjusted_amount) as total_adjusted_wins,
  SUM(pt.profit_reduction) as total_profit_retained,
  AVG(pt.effective_rtp) as avg_effective_rtp,
  AVG(pt.provider_rtp) as avg_provider_rtp
FROM profit_tracking pt
JOIN games g ON pt.game_id = g.id
GROUP BY DATE(pt.created_at), g.id, g.name, g.provider, g.category
ORDER BY date DESC, total_profit_retained DESC; 