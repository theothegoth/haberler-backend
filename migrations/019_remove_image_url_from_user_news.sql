-- Remove image_url column from user_news table
-- All images are now managed through article_images table

ALTER TABLE user_news DROP COLUMN IF EXISTS image_url;
