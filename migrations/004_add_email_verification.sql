-- Add email verification columns to users table
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN verification_token_expires TIMESTAMP;

-- Add index on verification_token for faster lookups
CREATE INDEX idx_users_verification_token ON users(verification_token);

-- Add comment
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.verification_token IS 'Token for email verification';
COMMENT ON COLUMN users.verification_token_expires IS 'Expiration time for verification token';
