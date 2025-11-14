-- Migration: Add cancellation tracking table
-- Description: Creates a table to track game transaction cancellations for audit and reporting purposes
-- Date: 2025-01-27

-- Create cancellation_tracking table
CREATE TABLE IF NOT EXISTS cancellation_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    original_transaction_id VARCHAR(255) NOT NULL,
    original_type VARCHAR(50) NOT NULL CHECK (original_type IN ('bet', 'win')),
    original_amount DECIMAL(15,2) NOT NULL,
    balance_adjustment DECIMAL(15,2) NOT NULL,
    reason TEXT,
    game_id INTEGER,
    category VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    adjustment_transaction_id INTEGER,
    cancelled_by VARCHAR(50) DEFAULT 'user', -- 'user', 'admin', 'system'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_user_id ON cancellation_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_transaction_id ON cancellation_tracking(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_original_transaction_id ON cancellation_tracking(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_created_at ON cancellation_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_game_id ON cancellation_tracking(game_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_category ON cancellation_tracking(category);

-- Add foreign key constraints
ALTER TABLE cancellation_tracking 
ADD CONSTRAINT fk_cancellation_tracking_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE cancellation_tracking 
ADD CONSTRAINT fk_cancellation_tracking_game_id 
FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL;

-- Add unique constraint to prevent duplicate cancellations
ALTER TABLE cancellation_tracking 
ADD CONSTRAINT uk_cancellation_tracking_original_transaction 
UNIQUE (original_transaction_id);

-- Add comments for documentation
COMMENT ON TABLE cancellation_tracking IS 'Tracks all game transaction cancellations for audit and reporting purposes';
COMMENT ON COLUMN cancellation_tracking.user_id IS 'ID of the user who requested the cancellation';
COMMENT ON COLUMN cancellation_tracking.transaction_id IS 'Unique identifier for the cancellation transaction';
COMMENT ON COLUMN cancellation_tracking.original_transaction_id IS 'ID of the original transaction being cancelled';
COMMENT ON COLUMN cancellation_tracking.original_type IS 'Type of the original transaction (bet or win)';
COMMENT ON COLUMN cancellation_tracking.original_amount IS 'Original amount of the transaction';
COMMENT ON COLUMN cancellation_tracking.balance_adjustment IS 'Amount added/subtracted from balance (positive for bet cancellation, negative for win cancellation)';
COMMENT ON COLUMN cancellation_tracking.reason IS 'Optional reason provided for the cancellation';
COMMENT ON COLUMN cancellation_tracking.game_id IS 'ID of the game associated with the transaction';
COMMENT ON COLUMN cancellation_tracking.category IS 'Game category (slot, tablegame, etc.)';
COMMENT ON COLUMN cancellation_tracking.currency IS 'Currency of the transaction';
COMMENT ON COLUMN cancellation_tracking.balance_before IS 'User balance before the cancellation';
COMMENT ON COLUMN cancellation_tracking.balance_after IS 'User balance after the cancellation';
COMMENT ON COLUMN cancellation_tracking.adjustment_transaction_id IS 'ID of the adjustment transaction created';
COMMENT ON COLUMN cancellation_tracking.cancelled_by IS 'Who initiated the cancellation (user, admin, system)';
COMMENT ON COLUMN cancellation_tracking.ip_address IS 'IP address of the user who requested cancellation';
COMMENT ON COLUMN cancellation_tracking.user_agent IS 'User agent of the client that requested cancellation';

-- Create a view for easy reporting
CREATE OR REPLACE VIEW cancellation_summary AS
SELECT 
    ct.id,
    ct.user_id,
    u.username,
    ct.transaction_id,
    ct.original_transaction_id,
    ct.original_type,
    ct.original_amount,
    ct.balance_adjustment,
    ct.reason,
    ct.game_id,
    g.name as game_name,
    ct.category,
    ct.currency,
    ct.balance_before,
    ct.balance_after,
    ct.cancelled_by,
    ct.created_at
FROM cancellation_tracking ct
LEFT JOIN users u ON ct.user_id = u.id
LEFT JOIN games g ON ct.game_id = g.id
ORDER BY ct.created_at DESC;

-- Add comment to the view
COMMENT ON VIEW cancellation_summary IS 'Summary view of all cancellations with user and game information';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_cancellation_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_cancellation_tracking_updated_at
    BEFORE UPDATE ON cancellation_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_cancellation_tracking_updated_at();

-- Insert sample data for testing (optional)
-- INSERT INTO cancellation_tracking (
--     user_id, transaction_id, original_transaction_id, original_type, 
--     original_amount, balance_adjustment, reason, game_id, category,
--     balance_before, balance_after, cancelled_by
-- ) VALUES (
--     1, 'cancel_2223977', '2223977', 'bet', 0.15, 0.15, 
--     'User requested bet cancellation', 53, 'slot', 1499.19, 1499.34, 'user'
-- ); 