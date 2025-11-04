-- Create comments table for news articles
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES user_news(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_news_id ON comments(news_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

COMMENT ON TABLE comments IS 'User comments on news articles';
COMMENT ON COLUMN comments.news_id IS 'Reference to the news article';
COMMENT ON COLUMN comments.user_id IS 'User who made the comment';
COMMENT ON COLUMN comments.content IS 'Comment text content';
