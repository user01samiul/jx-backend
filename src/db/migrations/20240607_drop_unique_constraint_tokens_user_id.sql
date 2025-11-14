-- Migration: Drop unique constraint on user_id in tokens table
ALTER TABLE tokens DROP CONSTRAINT unique_user_id; 