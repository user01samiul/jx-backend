-- Migration: Backfill bonus_instance_id for existing free spins campaigns
-- This ensures winnings from free spins get tracked in the bonus wallet

-- Step 1: Create a free spins bonus plan if it doesn't exist
INSERT INTO bonus_plans (
  name, brand_id, start_date, end_date, trigger_type, award_type, amount,
  wager_requirement_multiplier, is_playable, cancel_on_withdrawal, status,
  description
) VALUES (
  'Free Spins Winnings Bonus',
  1,
  NOW(),
  NOW() + INTERVAL '10 years',
  'manual',
  'flat_amount',
  0,
  0, -- No wagering requirement
  true, -- Playable
  false, -- Don't cancel on withdrawal
  'active',
  'Bonus plan for tracking free spins campaign winnings'
)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Get the bonus plan ID
DO $$
DECLARE
  v_bonus_plan_id BIGINT;
  v_campaign RECORD;
  v_bonus_instance_id BIGINT;
BEGIN
  -- Get the free spins bonus plan ID
  SELECT id INTO v_bonus_plan_id
  FROM bonus_plans
  WHERE name = 'Free Spins Winnings Bonus'
  LIMIT 1;

  IF v_bonus_plan_id IS NULL THEN
    RAISE EXCEPTION 'Free Spins Bonus Plan not found';
  END IF;

  RAISE NOTICE 'Using bonus plan ID: %', v_bonus_plan_id;

  -- Loop through all campaigns without bonus_instance_id
  FOR v_campaign IN
    SELECT id, user_id, expires_at, total_win_amount
    FROM user_free_spins_campaigns
    WHERE bonus_instance_id IS NULL
      AND status IN ('pending', 'active')
  LOOP
    -- Create a bonus instance for this campaign
    INSERT INTO bonus_instances (
      bonus_plan_id, player_id, bonus_amount, remaining_bonus,
      wager_requirement_amount, status, granted_at, expires_at
    ) VALUES (
      v_bonus_plan_id,
      v_campaign.user_id,
      COALESCE(v_campaign.total_win_amount, 0), -- Use existing winnings
      COALESCE(v_campaign.total_win_amount, 0), -- Use existing winnings
      0, -- No wagering
      'active',
      CURRENT_TIMESTAMP,
      v_campaign.expires_at
    )
    RETURNING id INTO v_bonus_instance_id;

    -- Link the bonus instance to the campaign
    UPDATE user_free_spins_campaigns
    SET bonus_instance_id = v_bonus_instance_id
    WHERE id = v_campaign.id;

    RAISE NOTICE 'Created bonus instance % for campaign % (user %)', v_bonus_instance_id, v_campaign.id, v_campaign.user_id;
  END LOOP;
END $$;

-- Step 3: Verify the migration
SELECT 
  COUNT(*) as total_campaigns,
  COUNT(bonus_instance_id) as campaigns_with_bonus,
  COUNT(*) - COUNT(bonus_instance_id) as campaigns_without_bonus
FROM user_free_spins_campaigns
WHERE status IN ('pending', 'active');
