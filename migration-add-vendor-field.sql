-- Migration: Add vendor field to games table
-- Date: 2024-12-19

-- Add vendor column to games table
ALTER TABLE games ADD COLUMN vendor VARCHAR(50);

-- Add index for vendor field for better query performance
CREATE INDEX idx_games_vendor ON games(vendor);

-- Update existing games to have vendor = provider (lowercase) as default
UPDATE games SET vendor = LOWER(provider) WHERE vendor IS NULL;

-- Make vendor field NOT NULL after setting default values
ALTER TABLE games ALTER COLUMN vendor SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN games.vendor IS 'Vendor identifier (usually lowercase provider name)'; 