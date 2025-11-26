-- Add pg_trgm extension for text search if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add performance indexes for frequently accessed columns

-- Index for news feed sorting (created_at is heavily used)
CREATE INDEX IF NOT EXISTS idx_user_news_created_at ON user_news(created_at DESC);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_user_news_category ON user_news(category);

-- Index for finding comments by news_id (foreign key index usually helps)
-- Note: created_at is also used for sorting comments
CREATE INDEX IF NOT EXISTS idx_comments_news_id_created_at ON comments(news_id, created_at DESC);

-- Index for user search (username) - assuming basic partial match
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin (username gin_trgm_ops);

-- Index for article views (already has idx_article_views_news_id from creation)
-- Adding index for viewed_at for time-based analytics
CREATE INDEX IF NOT EXISTS idx_article_views_viewed_at ON article_views(viewed_at);

-- Index for drafts by user (already likely covered by user_id fk, but compound with updated_at helps)
CREATE INDEX IF NOT EXISTS idx_drafts_user_id_updated_at ON drafts(user_id, updated_at DESC);
