-- Add article_type column to drafts table
ALTER TABLE drafts
ADD COLUMN article_type VARCHAR(20) DEFAULT 'news' CHECK (article_type IN ('news', 'opinion', 'analysis', 'interview', 'editorial'));

-- Update existing drafts to have 'news' as default type
UPDATE drafts SET article_type = 'news' WHERE article_type IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE drafts ALTER COLUMN article_type SET NOT NULL;
