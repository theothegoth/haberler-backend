-- Remove the foreign key constraint from article_images
-- This allows images to be added to both drafts and published articles

-- Drop the existing foreign key constraint
ALTER TABLE article_images
DROP CONSTRAINT IF EXISTS article_images_article_id_fkey;

-- We don't add a new FK constraint because article_id can reference either
-- user_news(id) or drafts(id), and PostgreSQL doesn't support multi-table FK
