-- =====================================================
-- AFFILIATE SYSTEM ENHANCEMENT MIGRATION
-- This adds application workflow, balance system, and redemption features
-- =====================================================

-- =====================================================
-- 1. AFFILIATE APPLICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS affiliate_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  application_status VARCHAR(20) DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected')),

  -- Application data
  display_name VARCHAR(100) NOT NULL,
  website_url VARCHAR(255),
  social_media_links JSONB,
  traffic_sources TEXT[], -- Where they will promote
  expected_monthly_referrals INTEGER,
  marketing_experience TEXT,
  additional_info TEXT,

  -- Referral code preferences
  preferred_referral_code VARCHAR(50),
  upline_referral_code VARCHAR(50), -- Join under existing affiliate

  -- Review data
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_by INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_user_id ON affiliate_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_status ON affiliate_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_created_at ON affiliate_applications(created_at);

-- =====================================================
-- 2. EXTEND AFFILIATE_PROFILES TABLE
-- =====================================================

-- Add approval tracking fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'affiliate_profiles' AND column_name = 'application_id') THEN
    ALTER TABLE affiliate_profiles ADD COLUMN application_id INTEGER REFERENCES affiliate_applications(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'affiliate_profiles' AND column_name = 'approved_at') THEN
    ALTER TABLE affiliate_profiles ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'affiliate_profiles' AND column_name = 'approved_by') THEN
    ALTER TABLE affiliate_profiles ADD COLUMN approved_by INTEGER REFERENCES users(id);
  END IF;
END $$;

-- =====================================================
-- 3. EXTEND USER_BALANCES TABLE
-- =====================================================

-- Add affiliate balance fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_balances' AND column_name = 'affiliate_balance') THEN
    ALTER TABLE user_balances ADD COLUMN affiliate_balance NUMERIC(20,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_balances' AND column_name = 'affiliate_balance_locked') THEN
    ALTER TABLE user_balances ADD COLUMN affiliate_balance_locked NUMERIC(20,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_balances' AND column_name = 'affiliate_total_earned') THEN
    ALTER TABLE user_balances ADD COLUMN affiliate_total_earned NUMERIC(20,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_balances' AND column_name = 'affiliate_total_redeemed') THEN
    ALTER TABLE user_balances ADD COLUMN affiliate_total_redeemed NUMERIC(20,2) DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- 4. AFFILIATE BALANCE TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS affiliate_balance_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
    'commission_earned',
    'redemption_instant',
    'redemption_unlocked',
    'adjustment',
    'reversal'
  )),

  -- Amounts
  amount NUMERIC(20,2) NOT NULL,
  balance_before NUMERIC(20,2) NOT NULL,
  balance_after NUMERIC(20,2) NOT NULL,

  -- References
  commission_id INTEGER REFERENCES affiliate_commissions(id), -- If from commission
  redemption_id INTEGER, -- Link to redemption record

  -- Metadata
  description TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_balance_tx_user_id ON affiliate_balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_balance_tx_type ON affiliate_balance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_affiliate_balance_tx_created_at ON affiliate_balance_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_balance_tx_commission_id ON affiliate_balance_transactions(commission_id);

-- =====================================================
-- 5. AFFILIATE REDEMPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS affiliate_redemptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Redemption amounts
  total_amount NUMERIC(20,2) NOT NULL, -- Total requested
  instant_amount NUMERIC(20,2) NOT NULL, -- 50% instant
  locked_amount NUMERIC(20,2) NOT NULL, -- 50% locked

  -- Status tracking
  instant_status VARCHAR(20) DEFAULT 'completed' CHECK (instant_status IN ('completed', 'failed', 'cancelled')),
  locked_status VARCHAR(20) DEFAULT 'locked' CHECK (locked_status IN ('locked', 'unlocked', 'cancelled')),

  -- Unlock tracking
  unlock_date TIMESTAMPTZ NOT NULL, -- When locked portion unlocks (created_at + 7 days)
  unlocked_at TIMESTAMPTZ, -- Actual unlock timestamp

  -- Transaction references
  instant_transaction_id INTEGER REFERENCES transactions(id), -- Main balance transaction for instant 50%
  unlock_transaction_id INTEGER REFERENCES transactions(id), -- Main balance transaction for unlocked 50%

  -- Affiliate balance transaction references
  instant_aff_transaction_id INTEGER REFERENCES affiliate_balance_transactions(id),
  unlock_aff_transaction_id INTEGER REFERENCES affiliate_balance_transactions(id),

  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  cancelled_by INTEGER REFERENCES users(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_by INTEGER DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_redemptions_user_id ON affiliate_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_redemptions_unlock_date ON affiliate_redemptions(unlock_date);
CREATE INDEX IF NOT EXISTS idx_affiliate_redemptions_locked_status ON affiliate_redemptions(locked_status);
CREATE INDEX IF NOT EXISTS idx_affiliate_redemptions_created_at ON affiliate_redemptions(created_at);

-- =====================================================
-- 6. AFFILIATE SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS affiliate_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Insert default settings
INSERT INTO affiliate_settings (setting_key, setting_value, description) VALUES
  ('commission_rates', '{
    "level_1": 5.0,
    "level_2": 2.0,
    "level_3": 1.0,
    "deposit": 10.0,
    "bet_revenue": 3.0,
    "loss": 5.0
  }', 'Default commission rates for different levels and types'),

  ('redemption_settings', '{
    "minimum_redemption": 10.00,
    "instant_percentage": 50,
    "lock_days": 7,
    "auto_unlock_enabled": true
  }', 'Redemption configuration'),

  ('application_settings', '{
    "auto_approve_enabled": false,
    "auto_approve_threshold_referrals": 0,
    "require_website": false,
    "require_social_media": false,
    "min_marketing_experience_length": 50
  }', 'Application approval settings'),

  ('commission_approval_settings', '{
    "auto_approve_enabled": false,
    "auto_approve_threshold": 10.00,
    "auto_approve_delay_hours": 24,
    "require_manual_review_above": 100.00
  }', 'Commission approval automation settings'),

  ('mlm_settings', '{
    "enabled": true,
    "max_levels": 3,
    "allow_self_referrals": false,
    "check_duplicate_ips": true
  }', 'MLM configuration')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for affiliate_applications
CREATE OR REPLACE FUNCTION update_affiliate_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_affiliate_applications_updated_at ON affiliate_applications;
CREATE TRIGGER trg_affiliate_applications_updated_at
  BEFORE UPDATE ON affiliate_applications
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_applications_updated_at();

-- Trigger for affiliate_redemptions
CREATE OR REPLACE FUNCTION update_affiliate_redemptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_affiliate_redemptions_updated_at ON affiliate_redemptions;
CREATE TRIGGER trg_affiliate_redemptions_updated_at
  BEFORE UPDATE ON affiliate_redemptions
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_redemptions_updated_at();

-- Trigger for affiliate_settings
CREATE OR REPLACE FUNCTION update_affiliate_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_affiliate_settings_updated_at ON affiliate_settings;
CREATE TRIGGER trg_affiliate_settings_updated_at
  BEFORE UPDATE ON affiliate_settings
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_settings_updated_at();

-- =====================================================
-- 8. FUNCTIONS FOR AFFILIATE BALANCE MANAGEMENT
-- =====================================================

-- Function to get affiliate balance summary
CREATE OR REPLACE FUNCTION get_affiliate_balance_summary(p_user_id INTEGER)
RETURNS TABLE (
  user_id INTEGER,
  affiliate_balance NUMERIC,
  affiliate_balance_locked NUMERIC,
  affiliate_total_earned NUMERIC,
  affiliate_total_redeemed NUMERIC,
  pending_commissions NUMERIC,
  approved_commissions NUMERIC,
  total_referrals INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ub.user_id,
    COALESCE(ub.affiliate_balance, 0) as affiliate_balance,
    COALESCE(ub.affiliate_balance_locked, 0) as affiliate_balance_locked,
    COALESCE(ub.affiliate_total_earned, 0) as affiliate_total_earned,
    COALESCE(ub.affiliate_total_redeemed, 0) as affiliate_total_redeemed,
    COALESCE(SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END), 0) as pending_commissions,
    COALESCE(SUM(CASE WHEN ac.status = 'approved' THEN ac.commission_amount ELSE 0 END), 0) as approved_commissions,
    COALESCE(ap.total_referrals, 0) as total_referrals
  FROM user_balances ub
  LEFT JOIN affiliate_commissions ac ON ac.affiliate_id = ub.user_id
  LEFT JOIN affiliate_profiles ap ON ap.user_id = ub.user_id
  WHERE ub.user_id = p_user_id
  GROUP BY ub.user_id, ub.affiliate_balance, ub.affiliate_balance_locked,
           ub.affiliate_total_earned, ub.affiliate_total_redeemed, ap.total_referrals;
END;
$$ LANGUAGE plpgsql;

-- Function to process commission approval (updates affiliate balance)
CREATE OR REPLACE FUNCTION process_commission_approval(p_commission_id INTEGER, p_approved_by INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_commission RECORD;
  v_current_balance NUMERIC;
BEGIN
  -- Get commission details
  SELECT * INTO v_commission
  FROM affiliate_commissions
  WHERE id = p_commission_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission not found or already processed';
  END IF;

  -- Update commission status
  UPDATE affiliate_commissions
  SET status = 'approved',
      updated_at = CURRENT_TIMESTAMP,
      updated_by = p_approved_by
  WHERE id = p_commission_id;

  -- Get current affiliate balance
  SELECT COALESCE(affiliate_balance, 0) INTO v_current_balance
  FROM user_balances
  WHERE user_id = v_commission.affiliate_id;

  -- Update affiliate balance
  UPDATE user_balances
  SET affiliate_balance = affiliate_balance + v_commission.commission_amount,
      affiliate_total_earned = affiliate_total_earned + v_commission.commission_amount
  WHERE user_id = v_commission.affiliate_id;

  -- Create balance transaction record
  INSERT INTO affiliate_balance_transactions (
    user_id, transaction_type, amount, balance_before, balance_after,
    commission_id, description, created_by
  ) VALUES (
    v_commission.affiliate_id,
    'commission_earned',
    v_commission.commission_amount,
    v_current_balance,
    v_current_balance + v_commission.commission_amount,
    p_commission_id,
    'Commission approved: ' || v_commission.commission_type,
    p_approved_by
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending unlock redemptions
CREATE OR REPLACE FUNCTION get_pending_unlocks()
RETURNS TABLE (
  redemption_id INTEGER,
  user_id INTEGER,
  locked_amount NUMERIC,
  unlock_date TIMESTAMPTZ,
  days_until_unlock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id as redemption_id,
    ar.user_id,
    ar.locked_amount,
    ar.unlock_date,
    EXTRACT(DAY FROM (ar.unlock_date - CURRENT_TIMESTAMP))::INTEGER as days_until_unlock
  FROM affiliate_redemptions ar
  WHERE ar.locked_status = 'locked'
    AND ar.unlock_date > CURRENT_TIMESTAMP
  ORDER BY ar.unlock_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. VIEWS FOR ADMIN DASHBOARD
-- =====================================================

-- View for affiliate applications summary
CREATE OR REPLACE VIEW affiliate_applications_summary AS
SELECT
  application_status,
  COUNT(*) as count,
  COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as count_last_7_days,
  COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as count_last_30_days
FROM affiliate_applications
GROUP BY application_status;

-- View for affiliate performance summary
CREATE OR REPLACE VIEW affiliate_performance_summary AS
SELECT
  ap.user_id,
  ap.referral_code,
  ap.display_name,
  ap.is_active,
  ap.total_referrals,
  COALESCE(ub.affiliate_balance, 0) as current_balance,
  COALESCE(ub.affiliate_balance_locked, 0) as locked_balance,
  COALESCE(ub.affiliate_total_earned, 0) as total_earned,
  COALESCE(ub.affiliate_total_redeemed, 0) as total_redeemed,
  COUNT(DISTINCT ac.id) as total_commissions,
  SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END) as pending_commissions,
  SUM(CASE WHEN ac.status = 'approved' THEN ac.commission_amount ELSE 0 END) as approved_commissions,
  SUM(CASE WHEN ac.status = 'paid' THEN ac.commission_amount ELSE 0 END) as paid_commissions,
  ap.created_at as joined_at
FROM affiliate_profiles ap
LEFT JOIN user_balances ub ON ap.user_id = ub.user_id
LEFT JOIN affiliate_commissions ac ON ap.user_id = ac.affiliate_id
GROUP BY ap.user_id, ap.referral_code, ap.display_name, ap.is_active,
         ap.total_referrals, ub.affiliate_balance, ub.affiliate_balance_locked,
         ub.affiliate_total_earned, ub.affiliate_total_redeemed, ap.created_at;

-- =====================================================
-- 10. GRANT PERMISSIONS (adjust as needed)
-- =====================================================

-- Grant select permissions on views
GRANT SELECT ON affiliate_applications_summary TO PUBLIC;
GRANT SELECT ON affiliate_performance_summary TO PUBLIC;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMIT;
