-- Migration: Add comprehensive affiliate system
-- This enables affiliate marketing with commission tracking and management

-- =====================================================
-- AFFILIATE SYSTEM TABLES
-- =====================================================

-- Table to track affiliate relationships
CREATE TABLE IF NOT EXISTS affiliate_relationships (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 5.00, -- Default 5% commission
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  first_deposit_amount NUMERIC(20,2) DEFAULT 0,
  first_deposit_date TIMESTAMPTZ,
  total_commission_earned NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1,
  UNIQUE(affiliate_id, referred_user_id)
);

-- Table to track affiliate commissions
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  commission_amount NUMERIC(20,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  base_amount NUMERIC(20,2) NOT NULL, -- The amount that commission is calculated from
  commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('deposit', 'bet', 'loss', 'net_gaming_revenue')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  paid_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Table to track affiliate payouts
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_amount NUMERIC(20,2) NOT NULL,
  commission_ids INTEGER[] NOT NULL, -- Array of commission IDs included in this payout
  payment_method VARCHAR(50),
  payment_reference TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  processed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Table to store affiliate referral codes and settings
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  website_url VARCHAR(255),
  social_media_links JSONB, -- Store social media links as JSON
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  minimum_payout NUMERIC(20,2) DEFAULT 50.00,
  payment_methods JSONB, -- Store preferred payment methods
  is_active BOOLEAN DEFAULT TRUE,
  total_referrals INTEGER DEFAULT 0,
  total_commission_earned NUMERIC(20,2) DEFAULT 0,
  total_payouts_received NUMERIC(20,2) DEFAULT 0,
  manager_id INTEGER REFERENCES users(id), -- Affiliates Manager who manages this affiliate
  team_id INTEGER, -- Team ID for grouping affiliates
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Table to track affiliate marketing materials
CREATE TABLE IF NOT EXISTS affiliate_marketing_materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('banner', 'text_link', 'landing_page', 'email_template', 'social_media')),
  content TEXT, -- HTML content or text
  image_url VARCHAR(500),
  target_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Table to track affiliate clicks and conversions
CREATE TABLE IF NOT EXISTS affiliate_tracking (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  visitor_ip VARCHAR(45),
  user_agent TEXT,
  landing_page VARCHAR(500),
  marketing_material_id INTEGER REFERENCES affiliate_marketing_materials(id),
  session_id VARCHAR(100),
  conversion_type VARCHAR(20) CHECK (conversion_type IN ('registration', 'deposit', 'first_deposit')),
  converted_user_id INTEGER REFERENCES users(id),
  conversion_amount NUMERIC(20,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for affiliate teams (managed by Affiliates Manager)
CREATE TABLE IF NOT EXISTS affiliate_teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Affiliates Manager
  team_commission_rate NUMERIC(5,2) DEFAULT 5.00, -- Default commission rate for team
  team_goals JSONB, -- Team performance goals
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);

-- Table for team performance tracking
CREATE TABLE IF NOT EXISTS team_performance (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES affiliate_teams(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_commission_earned NUMERIC(20,2) DEFAULT 0,
  total_payouts NUMERIC(20,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  team_goal_achievement NUMERIC(5,2) DEFAULT 0, -- Percentage of goal achieved
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for manager permissions and settings
CREATE TABLE IF NOT EXISTS manager_permissions (
  id SERIAL PRIMARY KEY,
  manager_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  can_create_affiliates BOOLEAN DEFAULT TRUE,
  can_edit_commission_rates BOOLEAN DEFAULT TRUE,
  can_approve_payouts BOOLEAN DEFAULT FALSE,
  can_view_team_analytics BOOLEAN DEFAULT TRUE,
  can_manage_marketing_materials BOOLEAN DEFAULT TRUE,
  max_team_size INTEGER DEFAULT 50,
  commission_approval_limit NUMERIC(20,2) DEFAULT 1000.00,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Affiliate relationships indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_relationships_affiliate_id ON affiliate_relationships(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_relationships_referred_user_id ON affiliate_relationships(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_relationships_referral_code ON affiliate_relationships(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_relationships_status ON affiliate_relationships(status);

-- Affiliate commissions indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referred_user_id ON affiliate_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_transaction_id ON affiliate_commissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_created_at ON affiliate_commissions(created_at);

-- Affiliate payouts indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_created_at ON affiliate_payouts(created_at);

-- Affiliate profiles indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_user_id ON affiliate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_referral_code ON affiliate_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_is_active ON affiliate_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_manager_id ON affiliate_profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_team_id ON affiliate_profiles(team_id);

-- Affiliate tracking indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_tracking_affiliate_id ON affiliate_tracking(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_tracking_referral_code ON affiliate_tracking(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_tracking_session_id ON affiliate_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_tracking_conversion_type ON affiliate_tracking(conversion_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_tracking_created_at ON affiliate_tracking(created_at);

-- Team management indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_teams_manager_id ON affiliate_teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_teams_is_active ON affiliate_teams(is_active);
CREATE INDEX IF NOT EXISTS idx_team_performance_team_id ON team_performance(team_id);
CREATE INDEX IF NOT EXISTS idx_team_performance_period ON team_performance(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_manager_permissions_manager_id ON manager_permissions(manager_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for affiliate_relationships
CREATE OR REPLACE FUNCTION update_affiliate_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affiliate_relationships_updated_at
  BEFORE UPDATE ON affiliate_relationships
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_relationships_updated_at();

-- Trigger for affiliate_commissions
CREATE OR REPLACE FUNCTION update_affiliate_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affiliate_commissions_updated_at
  BEFORE UPDATE ON affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_commissions_updated_at();

-- Trigger for affiliate_payouts
CREATE OR REPLACE FUNCTION update_affiliate_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affiliate_payouts_updated_at
  BEFORE UPDATE ON affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_payouts_updated_at();

-- Trigger for affiliate_profiles
CREATE OR REPLACE FUNCTION update_affiliate_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affiliate_profiles_updated_at
  BEFORE UPDATE ON affiliate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_profiles_updated_at();

-- Trigger for affiliate_teams
CREATE OR REPLACE FUNCTION update_affiliate_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affiliate_teams_updated_at
  BEFORE UPDATE ON affiliate_teams
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_teams_updated_at();

-- =====================================================
-- FUNCTIONS FOR AFFILIATE SYSTEM
-- =====================================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  code VARCHAR(50);
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM affiliate_profiles WHERE referral_code = code) THEN
      RETURN code;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique referral code after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate commission for a transaction
CREATE OR REPLACE FUNCTION calculate_affiliate_commission(
  p_affiliate_id INTEGER,
  p_referred_user_id INTEGER,
  p_transaction_id INTEGER,
  p_amount NUMERIC,
  p_commission_type VARCHAR(20)
)
RETURNS NUMERIC AS $$
DECLARE
  commission_rate NUMERIC(5,2);
  commission_amount NUMERIC(20,2);
BEGIN
  -- Get commission rate from affiliate relationship
  SELECT ar.commission_rate INTO commission_rate
  FROM affiliate_relationships ar
  WHERE ar.affiliate_id = p_affiliate_id 
    AND ar.referred_user_id = p_referred_user_id
    AND ar.status = 'active';
  
  IF commission_rate IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate commission amount
  commission_amount := (p_amount * commission_rate) / 100;
  
  -- Insert commission record
  INSERT INTO affiliate_commissions (
    affiliate_id, referred_user_id, transaction_id, 
    commission_amount, commission_rate, base_amount, commission_type
  ) VALUES (
    p_affiliate_id, p_referred_user_id, p_transaction_id,
    commission_amount, commission_rate, p_amount, p_commission_type
  );
  
  -- Update total commission earned in affiliate relationship
  UPDATE affiliate_relationships 
  SET total_commission_earned = total_commission_earned + commission_amount
  WHERE affiliate_id = p_affiliate_id AND referred_user_id = p_referred_user_id;
  
  -- Update affiliate profile total commission
  UPDATE affiliate_profiles 
  SET total_commission_earned = total_commission_earned + commission_amount
  WHERE user_id = p_affiliate_id;
  
  RETURN commission_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to get team performance summary
CREATE OR REPLACE FUNCTION get_team_performance_summary(p_team_id INTEGER, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  team_id INTEGER,
  team_name VARCHAR(100),
  total_affiliates INTEGER,
  active_affiliates INTEGER,
  total_referrals INTEGER,
  total_commission_earned NUMERIC,
  total_payouts NUMERIC,
  conversion_rate NUMERIC,
  goal_achievement NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    at.id as team_id,
    at.name as team_name,
    COUNT(ap.id) as total_affiliates,
    COUNT(CASE WHEN ap.is_active = true THEN 1 END) as active_affiliates,
    COALESCE(SUM(ap.total_referrals), 0) as total_referrals,
    COALESCE(SUM(ap.total_commission_earned), 0) as total_commission_earned,
    COALESCE(SUM(ap.total_payouts_received), 0) as total_payouts,
    CASE 
      WHEN COUNT(ap.id) > 0 THEN 
        (COUNT(ar.id)::NUMERIC / COUNT(ap.id)::NUMERIC) * 100
      ELSE 0 
    END as conversion_rate,
    CASE 
      WHEN at.team_goals->>'monthly_referrals' IS NOT NULL THEN
        (COUNT(ar.id)::NUMERIC / (at.team_goals->>'monthly_referrals')::NUMERIC) * 100
      ELSE 0 
    END as goal_achievement
  FROM affiliate_teams at
  LEFT JOIN affiliate_profiles ap ON at.id = ap.team_id
  LEFT JOIN affiliate_relationships ar ON ap.user_id = ar.affiliate_id
    AND ar.created_at >= p_start_date AND ar.created_at <= p_end_date
  WHERE at.id = p_team_id
  GROUP BY at.id, at.name, at.team_goals;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Add Affiliate role if not exists
INSERT INTO roles (name, description) 
VALUES ('Affiliate', 'Affiliate Marketing Partner')
ON CONFLICT (name) DO NOTHING;

-- Add Influencer role if not exists  
INSERT INTO roles (name, description)
VALUES ('Influencer', 'Influencer Marketing Partner')
ON CONFLICT (name) DO NOTHING;

-- Add Affiliates Manager role if not exists
INSERT INTO roles (name, description)
VALUES ('Affiliates Manager', 'Manages affiliate marketing teams')
ON CONFLICT (name) DO NOTHING;

-- Create sample affiliate marketing materials
INSERT INTO affiliate_marketing_materials (name, description, type, content, target_url) VALUES
('Welcome Banner', 'Main welcome banner for affiliates', 'banner', '<div class="affiliate-banner">Join JackpotX Casino and get amazing bonuses!</div>', '/register?ref={REFERRAL_CODE}'),
('Text Link', 'Simple text link for affiliates', 'text_link', 'Join JackpotX Casino - Best Online Casino', '/register?ref={REFERRAL_CODE}'),
('Email Template', 'Email template for affiliate marketing', 'email_template', 'Hi! Check out JackpotX Casino - amazing games and bonuses!', '/register?ref={REFERRAL_CODE}');

-- Create sample affiliate teams
INSERT INTO affiliate_teams (name, description, team_commission_rate, team_goals) VALUES
('Team Alpha', 'High-performing affiliate team', 6.00, '{"monthly_referrals": 100, "monthly_commission": 5000}'),
('Team Beta', 'Growing affiliate team', 5.50, '{"monthly_referrals": 50, "monthly_commission": 2500}'),
('Team Gamma', 'New affiliate team', 5.00, '{"monthly_referrals": 25, "monthly_commission": 1000}');

COMMIT; 