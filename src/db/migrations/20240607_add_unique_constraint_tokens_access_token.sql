-- Migration: Add unique constraint to access_token in tokens table
ALTER TABLE tokens ADD CONSTRAINT tokens_access_token_unique UNIQUE (access_token); 