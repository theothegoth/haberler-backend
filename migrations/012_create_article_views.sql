-- Add view_count column to user_news table
ALTER TABLE user_news
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create article_views table for tracking unique views
CREATE TABLE IF NOT EXISTS article_views (
  id SERIAL PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES user_news(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(news_id, user_id, ip_address)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_article_views_news_id ON article_views(news_id);
CREATE INDEX IF NOT EXISTS idx_article_views_user_id ON article_views(user_id);
CREATE INDEX IF NOT EXISTS idx_article_views_ip ON article_views(ip_address);
