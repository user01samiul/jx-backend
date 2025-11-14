-- Migration: Enhance affiliate system with MLM functionality
-- This adds missing MLM fields to the affiliate_profiles table

BEGIN;

-- Add MLM-specific columns to affiliate_profiles table
ALTER TABLE affiliate_profiles 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS upline_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS downline_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_downline_commission NUMERIC(20,2) DEFAULT 0;

-- Add index for MLM queries
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_upline_id ON affiliate_profiles(upline_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_level ON affiliate_profiles(level);

-- Add level column to affiliate_commissions table for MLM tracking
ALTER TABLE affiliate_commissions 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Add index for commission level queries
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_level ON affiliate_commissions(level);

-- Update existing affiliate profiles to have level 1 (direct affiliates)
UPDATE affiliate_profiles 
SET level = 1 
WHERE level IS NULL;

-- Update existing commissions to have level 1 (direct commissions)
UPDATE affiliate_commissions 
SET level = 1 
WHERE level IS NULL;

-- Create function to calculate downline count recursively
CREATE OR REPLACE FUNCTION calculate_downline_count(affiliate_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER := 0;
BEGIN
  -- Count direct downline
  SELECT COUNT(*) INTO count
  FROM affiliate_profiles 
  WHERE upline_id = affiliate_user_id;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update downline counts for all affiliates
CREATE OR REPLACE FUNCTION update_all_downline_counts()
RETURNS VOID AS $$
DECLARE
  affiliate_record RECORD;
BEGIN
  FOR affiliate_record IN SELECT user_id FROM affiliate_profiles LOOP
    UPDATE affiliate_profiles 
    SET downline_count = calculate_downline_count(affiliate_record.user_id)
    WHERE user_id = affiliate_record.user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update all existing downline counts
SELECT update_all_downline_counts();

-- Create trigger to automatically update downline count when upline changes
CREATE OR REPLACE FUNCTION update_downline_count_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old upline's downline count (if exists)
  IF OLD.upline_id IS NOT NULL THEN
    UPDATE affiliate_profiles 
    SET downline_count = downline_count - 1
    WHERE user_id = OLD.upline_id;
  END IF;
  
  -- Update new upline's downline count (if exists)
  IF NEW.upline_id IS NOT NULL THEN
    UPDATE affiliate_profiles 
    SET downline_count = downline_count + 1
    WHERE user_id = NEW.upline_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for affiliate_profiles table
DROP TRIGGER IF EXISTS trg_update_downline_count ON affiliate_profiles;
CREATE TRIGGER trg_update_downline_count
  AFTER UPDATE OF upline_id ON affiliate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_downline_count_trigger();

-- Create function to get MLM tree structure
CREATE OR REPLACE FUNCTION get_mlm_tree(affiliate_user_id INTEGER, max_depth INTEGER DEFAULT 3)
RETURNS TABLE (
  level INTEGER,
  affiliate_id INTEGER,
  username VARCHAR(50),
  display_name VARCHAR(100),
  total_commission_earned NUMERIC,
  downline_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE mlm_tree AS (
    -- Base case: the starting affiliate
    SELECT 
      0 as level,
      ap.user_id as affiliate_id,
      u.username,
      ap.display_name,
      ap.total_commission_earned,
      ap.downline_count
    FROM affiliate_profiles ap
    JOIN users u ON ap.user_id = u.id
    WHERE ap.user_id = affiliate_user_id
    
    UNION ALL
    
    -- Recursive case: downline affiliates
    SELECT 
      mt.level + 1,
      ap.user_id,
      u.username,
      ap.display_name,
      ap.total_commission_earned,
      ap.downline_count
    FROM affiliate_profiles ap
    JOIN users u ON ap.user_id = u.id
    JOIN mlm_tree mt ON ap.upline_id = mt.affiliate_id
    WHERE mt.level < max_depth
  )
  SELECT * FROM mlm_tree
  ORDER BY level, total_commission_earned DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate total downline commission
CREATE OR REPLACE FUNCTION calculate_total_downline_commission(affiliate_user_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  total_commission NUMERIC := 0;
BEGIN
  -- Sum all commissions from downline (up to 3 levels)
  SELECT COALESCE(SUM(ac.commission_amount), 0) INTO total_commission
  FROM affiliate_commissions ac
  JOIN affiliate_profiles ap ON ac.affiliate_id = ap.user_id
  WHERE ap.upline_id = affiliate_user_id
    AND ac.level > 1;
  
  RETURN total_commission;
END;
$$ LANGUAGE plpgsql;

-- Create function to update total downline commission for all affiliates
CREATE OR REPLACE FUNCTION update_all_downline_commissions()
RETURNS VOID AS $$
DECLARE
  affiliate_record RECORD;
BEGIN
  FOR affiliate_record IN SELECT user_id FROM affiliate_profiles LOOP
    UPDATE affiliate_profiles 
    SET total_downline_commission = calculate_total_downline_commission(affiliate_record.user_id)
    WHERE user_id = affiliate_record.user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update all existing downline commissions
SELECT update_all_downline_commissions();

-- Create view for MLM performance summary
CREATE OR REPLACE VIEW mlm_performance_summary AS
SELECT 
  ap.user_id,
  u.username,
  ap.display_name,
  ap.level,
  ap.upline_id,
  upline.username as upline_username,
  ap.downline_count,
  ap.total_commission_earned,
  ap.total_downline_commission,
  (ap.total_commission_earned + ap.total_downline_commission) as total_earnings,
  COUNT(ar.id) as total_referrals,
  COUNT(CASE WHEN ar.first_deposit_amount > 0 THEN 1 END) as conversions,
  CASE 
    WHEN COUNT(ar.id) > 0 THEN 
      (COUNT(CASE WHEN ar.first_deposit_amount > 0 THEN 1 END)::NUMERIC / COUNT(ar.id)::NUMERIC) * 100
    ELSE 0 
  END as conversion_rate
FROM affiliate_profiles ap
JOIN users u ON ap.user_id = u.id
LEFT JOIN users upline ON ap.upline_id = upline.id
LEFT JOIN affiliate_relationships ar ON ap.user_id = ar.affiliate_id
GROUP BY ap.user_id, u.username, ap.display_name, ap.level, ap.upline_id, upline.username, 
         ap.downline_count, ap.total_commission_earned, ap.total_downline_commission;

-- Create view for team MLM performance
CREATE OR REPLACE VIEW team_mlm_performance AS
SELECT 
  at.id as team_id,
  at.name as team_name,
  at.manager_id,
  um.username as manager_username,
  COUNT(ap.id) as total_affiliates,
  COUNT(CASE WHEN ap.is_active = true THEN 1 END) as active_affiliates,
  COALESCE(SUM(ap.total_commission_earned), 0) as total_direct_commission,
  COALESCE(SUM(ap.total_downline_commission), 0) as total_downline_commission,
  COALESCE(SUM(ap.total_commission_earned + ap.total_downline_commission), 0) as total_team_earnings,
  COALESCE(SUM(ap.downline_count), 0) as total_downline_count,
  COALESCE(SUM(ap.total_referrals), 0) as total_referrals,
  CASE 
    WHEN COUNT(ap.id) > 0 THEN 
      COALESCE(SUM(ap.total_commission_earned + ap.total_downline_commission), 0) / COUNT(ap.id)
    ELSE 0 
  END as average_earnings_per_affiliate
FROM affiliate_teams at
LEFT JOIN users um ON at.manager_id = um.id
LEFT JOIN affiliate_profiles ap ON at.id = ap.team_id
GROUP BY at.id, at.name, at.manager_id, um.username;

COMMIT; 