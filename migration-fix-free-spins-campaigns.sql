-- =====================================================
-- Fix Free Spins Campaigns Issues
-- =====================================================
-- This migration fixes:
-- 1. CHECK constraint that blocks 'manual' source inserts
-- 2. Adds bonus_instance_id to link campaigns with bonus wallet
-- 3. Removes duplicate unique constraint causing conflicts
-- =====================================================

-- 1. Drop and recreate the check_source constraint to allow 'manual'
ALTER TABLE user_free_spins_campaigns
DROP CONSTRAINT IF EXISTS check_source;

ALTER TABLE user_free_spins_campaigns
ADD CONSTRAINT check_source CHECK (source::text = ANY (ARRAY[
  'challenge'::character varying::text,
  'loyalty'::character varying::text,
  'manual'::character varying::text,
  'admin'::character varying::text
]));

-- 2. Add bonus_instance_id column to link free spins with bonus wallet
ALTER TABLE user_free_spins_campaigns
ADD COLUMN IF NOT EXISTS bonus_instance_id INTEGER REFERENCES bonus_instances(id) ON DELETE SET NULL;

-- 3. Create index on bonus_instance_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_free_spins_bonus_instance
ON user_free_spins_campaigns(bonus_instance_id);

-- 4. Drop the unique constraint on campaign_code (it should be unique per user, not globally)
ALTER TABLE user_free_spins_campaigns
DROP CONSTRAINT IF EXISTS user_free_spins_campaigns_campaign_code_key;

-- 5. Add composite unique constraint (user_id + campaign_code)
ALTER TABLE user_free_spins_campaigns
ADD CONSTRAINT user_free_spins_campaigns_user_campaign_unique
UNIQUE (user_id, campaign_code);

-- 6. Update source_id to be nullable (not all campaigns have a source_id)
ALTER TABLE user_free_spins_campaigns
ALTER COLUMN source_id DROP NOT NULL;

ALTER TABLE user_free_spins_campaigns
ALTER COLUMN source_id SET DEFAULT 0;

COMMENT ON TABLE user_free_spins_campaigns IS 'Stores free spins campaigns assigned to users';
COMMENT ON COLUMN user_free_spins_campaigns.bonus_instance_id IS 'Links to bonus_instances table for wagering tracking';
COMMENT ON COLUMN user_free_spins_campaigns.source IS 'Source of free spins: challenge, loyalty, manual (admin), or admin';

SELECT 'Free spins campaigns migration completed successfully!' as result;
