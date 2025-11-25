-- Create a shared sequence for both drafts and user_news tables
-- This prevents ID conflicts between the two tables

-- Create the shared sequence
CREATE SEQUENCE IF NOT EXISTS content_id_seq;

-- Get the current maximum ID from both tables
DO $$
DECLARE
    max_draft_id INTEGER;
    max_news_id INTEGER;
    max_id INTEGER;
BEGIN
    -- Get max ID from drafts
    SELECT COALESCE(MAX(id), 0) INTO max_draft_id FROM drafts;

    -- Get max ID from user_news
    SELECT COALESCE(MAX(id), 0) INTO max_news_id FROM user_news;

    -- Determine the overall maximum
    max_id := GREATEST(max_draft_id, max_news_id);

    -- Set the sequence to start from max_id + 1
    PERFORM setval('content_id_seq', max_id);

    RAISE NOTICE 'Shared sequence initialized to start at %', max_id + 1;
END $$;

-- Update drafts table to use the shared sequence
ALTER TABLE drafts ALTER COLUMN id SET DEFAULT nextval('content_id_seq');

-- Update user_news table to use the shared sequence
ALTER TABLE user_news ALTER COLUMN id SET DEFAULT nextval('content_id_seq');

-- Note: Existing rows are not affected, only new inserts will use the shared sequence
