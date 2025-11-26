-- Create a CODED welcome bonus that users can manually apply
INSERT INTO bonus_plans (
  name,
  brand_id,
  start_date,
  end_date,
  expiry_days,
  trigger_type,
  award_type,
  amount,
  currency,
  wager_requirement_multiplier,
  wager_requirement_type,
  wager_requirement_action,
  is_incremental,
  description,
  is_playable,
  playable_bonus_qualifies,
  release_playable_winnings,
  cancel_on_withdrawal,
  max_trigger_per_player,
  min_bonus_threshold,
  bonus_max_release,
  recurrence_type,
  bonus_code,
  max_code_usage,
  status,
  created_at,
  updated_at
) VALUES (
  'Welcome Code Bonus - $100',
  1,
  '2025-01-01 00:00:00+00',
  '2026-01-01 23:59:59+00',
  30,
  'coded',  -- This makes it a CODE bonus
  'flat_amount',
  100.00,
  'USD',
  10.0,  -- 10x wagering
  'bonus',
  'release',
  false,
  'Get $100 bonus! Use code WELCOME100. Wager 10x ($1,000) to unlock. Valid for 30 days.',
  true,
  false,
  false,
  true,
  1,  -- Max 1 per player
  10.00,
  1000.00,
  'non_recurring',
  'WELCOME100',  -- Users must enter this code
  1000,  -- Max 1000 uses
  'active',
  NOW(),
  NOW()
);
