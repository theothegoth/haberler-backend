-- Create article_images table for multiple images per article
CREATE TABLE IF NOT EXISTS article_images (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES user_news(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on article_id for faster lookups
CREATE INDEX idx_article_images_article_id ON article_images(article_id);

-- Create index on display_order for proper ordering
CREATE INDEX idx_article_images_order ON article_images(article_id, display_order);
