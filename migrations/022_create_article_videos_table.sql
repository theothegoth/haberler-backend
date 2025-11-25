-- Create article_videos table
-- This table stores YouTube video attachments for articles and drafts
-- Designed to support multiple videos per article for future expansion
-- Note: article_id can reference either drafts(id) or user_news(id) since they share content_id_seq
CREATE TABLE IF NOT EXISTS article_videos (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL,
  video_id VARCHAR(20) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_article_video_video
    FOREIGN KEY (video_id)
    REFERENCES videos_cache(video_id)
    ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_article_videos_article_id ON article_videos(article_id);
CREATE INDEX IF NOT EXISTS idx_article_videos_video_id ON article_videos(video_id);
