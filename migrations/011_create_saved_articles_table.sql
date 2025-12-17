-- Create saved_articles table for bookmarking articles
CREATE TABLE IF NOT EXISTS saved_articles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id INTEGER NOT NULL REFERENCES user_news(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, news_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_articles_user_id ON saved_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_news_id ON saved_articles(news_id);

COMMENT ON TABLE saved_articles IS 'Bookmarked/saved articles by users';
COMMENT ON COLUMN saved_articles.user_id IS 'User who saved the article';
COMMENT ON COLUMN saved_articles.news_id IS 'Article that was saved';
