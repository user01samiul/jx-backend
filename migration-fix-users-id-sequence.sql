-- Migration: Fix users table id column to have proper auto-increment
-- The id column needs a sequence and default value for auto-increment

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS users_id_seq;

-- Set the sequence to start from the maximum id value + 1
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1);

-- Alter the id column to have the sequence as default
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');

-- Make sure the sequence is owned by the users.id column
ALTER SEQUENCE users_id_seq OWNED BY users.id;

-- Verify the fix
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'id'; 