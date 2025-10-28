-- Add bio column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment
COMMENT ON COLUMN users.bio IS 'User biography or description';
