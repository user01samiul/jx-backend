-- Migration: Add balance inconsistencies tracking table
-- This table will track any balance calculation inconsistencies for investigation

CREATE TABLE IF NOT EXISTS balance_inconsistencies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,
    expected_balance DECIMAL(10,2) NOT NULL,
    actual_balance DECIMAL(10,2) NOT NULL,
    difference DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_balance_inconsistencies_user_id ON balance_inconsistencies(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_inconsistencies_created_at ON balance_inconsistencies(created_at);
CREATE INDEX IF NOT EXISTS idx_balance_inconsistencies_resolved_at ON balance_inconsistencies(resolved_at);

-- Add comment for documentation
COMMENT ON TABLE balance_inconsistencies IS 'Tracks balance calculation inconsistencies for investigation and resolution';
COMMENT ON COLUMN balance_inconsistencies.expected_balance IS 'The expected balance after the transaction';
COMMENT ON COLUMN balance_inconsistencies.actual_balance IS 'The actual balance found in the database';
COMMENT ON COLUMN balance_inconsistencies.difference IS 'The difference between expected and actual balance';
COMMENT ON COLUMN balance_inconsistencies.resolved_at IS 'When the inconsistency was resolved (NULL if unresolved)'; 