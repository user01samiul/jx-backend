-- Migration: Add game_id and category columns to tokens table
ALTER TABLE tokens ADD COLUMN game_id INTEGER;
ALTER TABLE tokens ADD COLUMN category VARCHAR(100); 