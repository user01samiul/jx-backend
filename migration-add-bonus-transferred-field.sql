-- Migration: Add total_bonus_transferred field to bonus_wallets table
-- This field tracks the total amount transferred from bonus wallet to main wallet
-- Date: 2025-01-26

-- Add total_bonus_transferred column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bonus_wallets'
        AND column_name = 'total_bonus_transferred'
    ) THEN
        ALTER TABLE bonus_wallets
        ADD COLUMN total_bonus_transferred DECIMAL(15, 2) DEFAULT 0 NOT NULL;

        -- Add comment
        COMMENT ON COLUMN bonus_wallets.total_bonus_transferred IS 'Total amount transferred from bonus wallet to main wallet (lifetime)';

        RAISE NOTICE 'Added total_bonus_transferred column to bonus_wallets table';
    ELSE
        RAISE NOTICE 'Column total_bonus_transferred already exists in bonus_wallets table';
    END IF;
END $$;

-- Update existing rows to have 0 if NULL
UPDATE bonus_wallets
SET total_bonus_transferred = 0
WHERE total_bonus_transferred IS NULL;

-- Verify the migration
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bonus_wallets'
AND column_name = 'total_bonus_transferred';
