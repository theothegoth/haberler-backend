-- Add parent_id column to comments table for nested replies (1 level deep)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;

-- Create index for parent_id to speed up reply queries
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- Create comment_likes table for tracking who liked which comments
CREATE TABLE IF NOT EXISTS comment_likes (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

COMMENT ON COLUMN comments.parent_id IS 'Reference to parent comment for replies (max 1 level deep)';
COMMENT ON TABLE comment_likes IS 'Tracks which users liked which comments';
