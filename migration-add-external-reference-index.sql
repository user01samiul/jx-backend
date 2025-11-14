-- Migration: Add index on external_reference field in transactions table
-- This improves performance for status command lookups

-- Check if index already exists before creating
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_transactions_external_reference' 
        AND tablename = 'transactions'
    ) THEN
        CREATE INDEX idx_transactions_external_reference ON transactions(external_reference);
        RAISE NOTICE 'Index idx_transactions_external_reference created successfully';
    ELSE
        RAISE NOTICE 'Index idx_transactions_external_reference already exists';
    END IF;
END $$; 