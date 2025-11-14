-- ============================================
-- PLAYER ANALYTICS TABLES FOR RETENTION
-- Created: 2025-11-05
-- Purpose: Track player behavior, predict churn, segment users
-- ============================================

-- 1. Player Analytics Events (Track all player actions)
CREATE TABLE IF NOT EXISTS player_analytics_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'bet_placed', 'game_started', 'deposit', 'withdrawal', 'login', 'logout'
  event_data JSONB DEFAULT '{}', -- Flexible data storage
  session_id UUID NOT NULL,
  device_type VARCHAR(20), -- 'mobile', 'desktop', 'tablet'
  ip_address INET,
  country_code VARCHAR(2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_events_user ON player_analytics_events(user_id, created_at DESC);
CREATE INDEX idx_player_events_type ON player_analytics_events(event_type);
CREATE INDEX idx_player_events_session ON player_analytics_events(session_id);
CREATE INDEX idx_player_events_created ON player_analytics_events(created_at DESC);

-- 2. Player Sessions (Detailed session tracking)
CREATE TABLE IF NOT EXISTS player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  games_played JSONB DEFAULT '[]', -- Array of game IDs
  total_bets DECIMAL(10,2) DEFAULT 0,
  total_wins DECIMAL(10,2) DEFAULT 0,
  net_result DECIMAL(10,2) DEFAULT 0,
  device_type VARCHAR(20),
  ip_address INET,
  country_code VARCHAR(2),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_player_sessions_user ON player_sessions(user_id, start_time DESC);
CREATE INDEX idx_player_sessions_active ON player_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_player_sessions_date ON player_sessions(start_time DESC);

-- 3. Player Segments (RFM & Other Segmentation)
CREATE TABLE IF NOT EXISTS player_segments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segment_type VARCHAR(50) NOT NULL, -- 'rfm', 'churn_risk', 'value_tier', 'engagement'
  segment_value VARCHAR(50) NOT NULL, -- 'champion', 'at_risk', 'vip', 'whale', etc.
  rfm_score VARCHAR(15), -- '5-5-5' format for RFM
  recency_score INTEGER CHECK (recency_score BETWEEN 1 AND 5),
  frequency_score INTEGER CHECK (frequency_score BETWEEN 1 AND 5),
  monetary_score INTEGER CHECK (monetary_score BETWEEN 1 AND 5),
  score DECIMAL(5,2), -- Overall score 0-100
  metadata JSONB DEFAULT '{}',
  calculated_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP
);

CREATE INDEX idx_player_segments_user ON player_segments(user_id, segment_type);
CREATE INDEX idx_player_segments_type ON player_segments(segment_type, segment_value);
CREATE INDEX idx_player_segments_score ON player_segments(score DESC);
CREATE UNIQUE INDEX idx_player_segments_active ON player_segments(user_id, segment_type) WHERE valid_until IS NULL OR valid_until > NOW();

-- 4. Churn Predictions
CREATE TABLE IF NOT EXISTS churn_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  churn_score DECIMAL(5,2) NOT NULL CHECK (churn_score BETWEEN 0 AND 100), -- 0-100
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB DEFAULT '[]', -- Array of risk factors
  recommended_actions JSONB DEFAULT '[]', -- Array of retention actions
  days_since_last_activity INTEGER,
  session_frequency_trend VARCHAR(20), -- 'increasing', 'stable', 'declining'
  bet_size_trend VARCHAR(20), -- 'increasing', 'stable', 'declining'
  loss_streak INTEGER DEFAULT 0,
  predicted_at TIMESTAMP DEFAULT NOW(),
  outcome VARCHAR(20), -- 'churned', 'retained', 'pending'
  outcome_date TIMESTAMP,
  action_taken JSONB DEFAULT '[]' -- Actions triggered for this user
);

CREATE INDEX idx_churn_predictions_user ON churn_predictions(user_id, predicted_at DESC);
CREATE INDEX idx_churn_predictions_risk ON churn_predictions(risk_level, churn_score DESC);
CREATE INDEX idx_churn_predictions_pending ON churn_predictions(outcome) WHERE outcome = 'pending';

-- 5. Player LTV (Lifetime Value)
CREATE TABLE IF NOT EXISTS player_ltv (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_ltv DECIMAL(10,2), -- Predicted based on first 30 days
  actual_ltv DECIMAL(10,2), -- Real LTV calculated
  total_deposits DECIMAL(10,2) DEFAULT 0,
  total_withdrawals DECIMAL(10,2) DEFAULT 0,
  total_bonuses DECIMAL(10,2) DEFAULT 0,
  total_bets DECIMAL(10,2) DEFAULT 0,
  total_wins DECIMAL(10,2) DEFAULT 0,
  net_revenue DECIMAL(10,2) DEFAULT 0, -- deposits - withdrawals - bonuses
  ggr DECIMAL(10,2) DEFAULT 0, -- Gross Gaming Revenue (bets - wins)
  first_deposit_date DATE,
  last_activity_date DATE,
  days_active INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  acquisition_channel VARCHAR(50),
  acquisition_cost DECIMAL(10,2),
  ltv_cac_ratio DECIMAL(5,2), -- LTV / CAC
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_ltv_user ON player_ltv(user_id);
CREATE INDEX idx_player_ltv_actual ON player_ltv(actual_ltv DESC);
CREATE INDEX idx_player_ltv_predicted ON player_ltv(predicted_ltv DESC);
CREATE INDEX idx_player_ltv_channel ON player_ltv(acquisition_channel);

-- 6. Player Cohorts
CREATE TABLE IF NOT EXISTS player_cohorts (
  id SERIAL PRIMARY KEY,
  cohort_name VARCHAR(100) NOT NULL,
  cohort_date DATE NOT NULL, -- Usually registration month
  cohort_type VARCHAR(50) NOT NULL, -- 'registration_month', 'first_deposit_amount', 'acquisition_channel'
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acquisition_channel VARCHAR(50),
  first_deposit_amount DECIMAL(10,2),
  device_type VARCHAR(20),
  country_code VARCHAR(2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_cohorts_date ON player_cohorts(cohort_date);
CREATE INDEX idx_player_cohorts_user ON player_cohorts(user_id);
CREATE INDEX idx_player_cohorts_type ON player_cohorts(cohort_type, cohort_date);

-- 7. Retention Metrics (Pre-calculated for performance)
CREATE TABLE IF NOT EXISTS retention_metrics (
  id SERIAL PRIMARY KEY,
  cohort_id INTEGER,
  cohort_name VARCHAR(100),
  cohort_date DATE NOT NULL,
  day_number INTEGER NOT NULL, -- 1, 7, 30, 60, 90, 180, 365
  retained_users INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  retention_rate DECIMAL(5,2) DEFAULT 0,
  avg_deposits DECIMAL(10,2) DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_retention_metrics_cohort ON retention_metrics(cohort_name, day_number);
CREATE INDEX idx_retention_metrics_date ON retention_metrics(cohort_date, day_number);

-- 8. Player Behavior Scores
CREATE TABLE IF NOT EXISTS player_behavior_scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  engagement_score DECIMAL(4,2) DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 10), -- 0-10
  risk_appetite_score DECIMAL(4,2) DEFAULT 0 CHECK (risk_appetite_score BETWEEN 0 AND 10), -- 0-10
  loyalty_score DECIMAL(4,2) DEFAULT 0 CHECK (loyalty_score BETWEEN 0 AND 10), -- 0-10
  value_score DECIMAL(4,2) DEFAULT 0 CHECK (value_score BETWEEN 0 AND 10), -- 0-10
  avg_session_duration INTEGER DEFAULT 0, -- seconds
  sessions_per_week DECIMAL(5,2) DEFAULT 0,
  favorite_game_category VARCHAR(50),
  betting_pattern VARCHAR(30), -- 'conservative', 'moderate', 'aggressive', 'chasing'
  last_calculated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_behavior_user ON player_behavior_scores(user_id);
CREATE INDEX idx_player_behavior_engagement ON player_behavior_scores(engagement_score DESC);
CREATE INDEX idx_player_behavior_value ON player_behavior_scores(value_score DESC);

-- 9. Automated Actions Log
CREATE TABLE IF NOT EXISTS automated_actions_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL, -- 'churn_risk_high', 'win_streak', 'loss_streak', etc.
  trigger_data JSONB DEFAULT '{}',
  action_type VARCHAR(50) NOT NULL, -- 'send_bonus', 'send_email', 'assign_vip', etc.
  action_details JSONB DEFAULT '{}',
  executed_at TIMESTAMP DEFAULT NOW(),
  result VARCHAR(20) DEFAULT 'pending', -- 'success', 'failed', 'pending'
  result_data JSONB DEFAULT '{}',
  cooldown_until TIMESTAMP
);

CREATE INDEX idx_automated_actions_user ON automated_actions_log(user_id, executed_at DESC);
CREATE INDEX idx_automated_actions_type ON automated_actions_log(trigger_type);
CREATE INDEX idx_automated_actions_pending ON automated_actions_log(result) WHERE result = 'pending';

-- 10. Responsible Gaming Alerts
CREATE TABLE IF NOT EXISTS responsible_gaming_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'extended_session', 'rapid_deposits', 'chasing_losses', etc.
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  alert_data JSONB DEFAULT '{}',
  triggered_at TIMESTAMP DEFAULT NOW(),
  action_taken VARCHAR(50), -- 'reality_check_sent', 'cooling_off_suggested', 'limit_reminder', etc.
  resolved_at TIMESTAMP,
  admin_notes TEXT
);

CREATE INDEX idx_rg_alerts_user ON responsible_gaming_alerts(user_id, triggered_at DESC);
CREATE INDEX idx_rg_alerts_severity ON responsible_gaming_alerts(severity) WHERE resolved_at IS NULL;
CREATE INDEX idx_rg_alerts_unresolved ON responsible_gaming_alerts(resolved_at) WHERE resolved_at IS NULL;

-- 11. Game Performance Analytics (Cached/Aggregated)
CREATE TABLE IF NOT EXISTS game_performance_analytics (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_bets BIGINT DEFAULT 0,
  total_wagered DECIMAL(15,2) DEFAULT 0,
  total_wins DECIMAL(15,2) DEFAULT 0,
  ggr DECIMAL(15,2) DEFAULT 0, -- Gross Gaming Revenue
  actual_rtp DECIMAL(5,2) DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  avg_bet_size DECIMAL(10,2) DEFAULT 0,
  avg_session_time INTEGER DEFAULT 0, -- seconds
  retention_contribution_score DECIMAL(5,2) DEFAULT 0, -- How much this game helps retention
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_perf_game ON game_performance_analytics(game_id, date DESC);
CREATE INDEX idx_game_perf_date ON game_performance_analytics(date DESC);
CREATE INDEX idx_game_perf_ggr ON game_performance_analytics(ggr DESC);

-- Create a view for easy RFM analysis
CREATE OR REPLACE VIEW player_rfm_view AS
SELECT
  u.id as user_id,
  u.username,
  u.email,
  -- Recency (days since last activity)
  COALESCE(DATE_PART('day', NOW() - MAX(ps.start_time)), 999) as recency_days,
  -- Frequency (number of sessions in last 90 days)
  COUNT(DISTINCT ps.id) as frequency_count,
  -- Monetary (total deposits in last 90 days)
  COALESCE(SUM(t.amount), 0) as monetary_value
FROM users u
LEFT JOIN player_sessions ps ON u.id = ps.user_id AND ps.start_time >= NOW() - INTERVAL '90 days'
LEFT JOIN transactions t ON u.id = t.user_id AND t.type = 'deposit' AND t.created_at >= NOW() - INTERVAL '90 days'
WHERE u.status_id = (SELECT id FROM statuses WHERE name = 'Active')
GROUP BY u.id, u.username, u.email;

-- Create a view for churn risk overview
CREATE OR REPLACE VIEW churn_risk_overview AS
SELECT
  u.id as user_id,
  u.username,
  u.email,
  cp.churn_score,
  cp.risk_level,
  cp.risk_factors,
  cp.days_since_last_activity,
  pbs.engagement_score,
  pbs.loyalty_score,
  plt.actual_ltv,
  ps.segment_value as rfm_segment,
  cp.predicted_at
FROM users u
LEFT JOIN churn_predictions cp ON u.id = cp.user_id AND cp.outcome = 'pending'
LEFT JOIN player_behavior_scores pbs ON u.id = pbs.user_id
LEFT JOIN player_ltv plt ON u.id = plt.user_id
LEFT JOIN player_segments ps ON u.id = ps.user_id AND ps.segment_type = 'rfm'
WHERE u.status_id = (SELECT id FROM statuses WHERE name = 'Active')
ORDER BY cp.churn_score DESC NULLS LAST;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Add comments for documentation
COMMENT ON TABLE player_analytics_events IS 'Tracks all player interactions for behavior analysis';
COMMENT ON TABLE player_sessions IS 'Detailed session tracking with gaming metrics';
COMMENT ON TABLE player_segments IS 'RFM and other segmentation data';
COMMENT ON TABLE churn_predictions IS 'ML-based churn predictions and risk scores';
COMMENT ON TABLE player_ltv IS 'Lifetime value calculations and predictions';
COMMENT ON TABLE player_cohorts IS 'Cohort grouping for retention analysis';
COMMENT ON TABLE retention_metrics IS 'Pre-calculated retention rates by cohort';
COMMENT ON TABLE player_behavior_scores IS 'Behavioral scoring for engagement and risk';
COMMENT ON TABLE automated_actions_log IS 'Log of automated retention actions';
COMMENT ON TABLE responsible_gaming_alerts IS 'Responsible gaming triggers and interventions';
COMMENT ON TABLE game_performance_analytics IS 'Game-level performance metrics';
