-- Migration: Create rtp_settings table for automated RTP control
CREATE TABLE IF NOT EXISTS rtp_settings (
  id SERIAL PRIMARY KEY,
  target_profit_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  effective_rtp NUMERIC(5,2) NOT NULL DEFAULT 80.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
); 