-- Add article_type column to user_news table
ALTER TABLE user_news
ADD COLUMN article_type VARCHAR(20) DEFAULT 'news' CHECK (article_type IN ('news', 'opinion', 'analysis', 'interview', 'editorial'));

-- Update existing articles to have 'news' as default type
UPDATE user_news SET article_type = 'news' WHERE article_type IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE user_news ALTER COLUMN article_type SET NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_user_news_article_type ON user_news(article_type);

-- Add comment for documentation
COMMENT ON COLUMN user_news.article_type IS 'Type of article: news (factual reporting), opinion (subjective viewpoint), analysis (in-depth examination), interview (Q&A format), editorial (institutional opinion)';
