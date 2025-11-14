-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'welcome_bonus',
        'deposit_bonus', 
        'free_spins',
        'cashback',
        'reload_bonus',
        'tournament',
        'loyalty_bonus',
        'referral_bonus'
    )),
    bonus_percentage DECIMAL(5,2) DEFAULT 0,
    max_bonus_amount DECIMAL(15,2) DEFAULT 0,
    min_deposit_amount DECIMAL(15,2) DEFAULT 0,
    wagering_requirement DECIMAL(5,2) DEFAULT 0,
    free_spins_count INTEGER DEFAULT 0,
    max_free_spins_value DECIMAL(15,2) DEFAULT 0,
    cashback_percentage DECIMAL(5,2) DEFAULT 0,
    max_cashback_amount DECIMAL(15,2) DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    applicable_games TEXT[], -- Array of game IDs
    excluded_games TEXT[], -- Array of game IDs
    user_groups TEXT[], -- Array of user group names
    max_claims_per_user INTEGER DEFAULT 1,
    terms_conditions TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create promotion_claims table
CREATE TABLE IF NOT EXISTS promotion_claims (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    bonus_amount DECIMAL(15,2) DEFAULT 0,
    free_spins_awarded INTEGER DEFAULT 0,
    wagering_progress DECIMAL(15,2) DEFAULT 0,
    wagering_requirement DECIMAL(15,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb -- Store additional data like game session info, etc.
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(type);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_featured ON promotions(is_featured);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON promotions(created_at);

CREATE INDEX IF NOT EXISTS idx_promotion_claims_user_id ON promotion_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_promotion_id ON promotion_claims(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_status ON promotion_claims(status);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_claimed_at ON promotion_claims(claimed_at);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_user_promotion ON promotion_claims(user_id, promotion_id);

-- Create unique constraint to prevent duplicate claims per user per promotion
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_promotion_claim ON promotion_claims(user_id, promotion_id) 
WHERE status != 'cancelled';

-- Add comments for documentation
COMMENT ON TABLE promotions IS 'Stores all promotion configurations and settings';
COMMENT ON TABLE promotion_claims IS 'Tracks user claims and progress for promotions';

COMMENT ON COLUMN promotions.type IS 'Type of promotion (welcome_bonus, deposit_bonus, etc.)';
COMMENT ON COLUMN promotions.bonus_percentage IS 'Percentage bonus to award (0-1000)';
COMMENT ON COLUMN promotions.max_bonus_amount IS 'Maximum bonus amount that can be awarded';
COMMENT ON COLUMN promotions.min_deposit_amount IS 'Minimum deposit required to claim this promotion';
COMMENT ON COLUMN promotions.wagering_requirement IS 'Wagering requirement multiplier (e.g., 35x)';
COMMENT ON COLUMN promotions.free_spins_count IS 'Number of free spins to award';
COMMENT ON COLUMN promotions.max_free_spins_value IS 'Maximum value per free spin';
COMMENT ON COLUMN promotions.cashback_percentage IS 'Cashback percentage (0-100)';
COMMENT ON COLUMN promotions.max_cashback_amount IS 'Maximum cashback amount';
COMMENT ON COLUMN promotions.applicable_games IS 'Array of game IDs where this promotion can be used';
COMMENT ON COLUMN promotions.excluded_games IS 'Array of game IDs where this promotion cannot be used';
COMMENT ON COLUMN promotions.user_groups IS 'Array of user group names eligible for this promotion';
COMMENT ON COLUMN promotions.max_claims_per_user IS 'Maximum number of times a user can claim this promotion';

COMMENT ON COLUMN promotion_claims.bonus_amount IS 'Actual bonus amount awarded to the user';
COMMENT ON COLUMN promotion_claims.free_spins_awarded IS 'Number of free spins actually awarded';
COMMENT ON COLUMN promotion_claims.wagering_progress IS 'Current wagering progress towards requirement';
COMMENT ON COLUMN promotion_claims.wagering_requirement IS 'Total wagering requirement for this claim';
COMMENT ON COLUMN promotion_claims.is_completed IS 'Whether the wagering requirement has been met';
COMMENT ON COLUMN promotion_claims.completed_at IS 'When the wagering requirement was completed';
COMMENT ON COLUMN promotion_claims.expires_at IS 'When this claim expires if not completed';
COMMENT ON COLUMN promotion_claims.status IS 'Current status of the claim';
COMMENT ON COLUMN promotion_claims.metadata IS 'Additional data stored as JSON';

-- Insert some sample promotions for testing
INSERT INTO promotions (
    name, 
    description, 
    type, 
    bonus_percentage, 
    max_bonus_amount, 
    min_deposit_amount, 
    wagering_requirement,
    is_active,
    is_featured
) VALUES 
(
    'Welcome Bonus',
    'Get 100% bonus on your first deposit up to $500',
    'welcome_bonus',
    100.00,
    500.00,
    20.00,
    35.00,
    true,
    true
),
(
    'Free Spins Package',
    'Get 50 free spins on selected slot games',
    'free_spins',
    0.00,
    0.00,
    10.00,
    25.00,
    true,
    false
),
(
    'Reload Bonus',
    'Get 50% bonus on your reload deposits',
    'reload_bonus',
    50.00,
    200.00,
    25.00,
    30.00,
    true,
    false
),
(
    'Cashback Offer',
    'Get 10% cashback on your losses this week',
    'cashback',
    0.00,
    0.00,
    0.00,
    0.00,
    true,
    false
) ON CONFLICT DO NOTHING; 