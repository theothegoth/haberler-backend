-- Add role field to users table
-- Migration: 023_add_user_roles

-- Create user role enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add role column to users table with default 'user'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user' NOT NULL;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update a specific user to admin (optional - will be done separately)
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
