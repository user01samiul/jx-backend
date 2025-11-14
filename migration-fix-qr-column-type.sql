-- Migration: Fix QR code column type to handle larger SVG data
-- The qr_code column needs to be TEXT instead of varchar(5000) to handle SVG data

-- Change qr_code column type from varchar(5000) to TEXT
ALTER TABLE users ALTER COLUMN qr_code TYPE TEXT;

-- Verify the column type was changed
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'qr_code'; 