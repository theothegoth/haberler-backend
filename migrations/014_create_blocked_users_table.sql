-- Create blocked_users table for user blocking functionality
-- When a user blocks another user, the blocked user's content will be hidden from the blocker
CREATE TABLE IF NOT EXISTS blocked_users (
  id SERIAL PRIMARY KEY,
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id),
  -- Prevent users from blocking themselves
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_blocked ON blocked_users(blocker_id, blocked_id);
