-- Add profile_picture column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);

COMMENT ON COLUMN users.profile_picture IS 'URL path to user profile picture';
