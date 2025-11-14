ALTER TABLE rtp_settings ADD COLUMN IF NOT EXISTS adjustment_mode VARCHAR(20) DEFAULT 'manual';
