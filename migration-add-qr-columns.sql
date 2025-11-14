-- Migration: Add QR code columns to users table
-- Run this script to add the missing columns to existing database

-- Add auth_secret column
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_secret VARCHAR(100);

-- Add qr_code column  
ALTER TABLE users ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.auth_secret IS 'Secret key for QR code authentication';
COMMENT ON COLUMN users.qr_code IS 'SVG QR code data for user authentication';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('auth_secret', 'qr_code'); 