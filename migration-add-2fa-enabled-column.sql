-- Migration: Add is_2fa_enabled column to users table
-- This migration adds the is_2fa_enabled boolean column to track 2FA activation status

BEGIN;

-- Add the is_2fa_enabled column with default value FALSE
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

-- Update existing users who have auth_secret to have 2FA enabled
-- This ensures existing users with 2FA setup are properly marked as enabled
UPDATE users 
SET is_2fa_enabled = TRUE 
WHERE auth_secret IS NOT NULL AND auth_secret != '';

COMMIT; 