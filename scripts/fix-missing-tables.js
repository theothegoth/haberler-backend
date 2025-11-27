require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const fixTables = async () => {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected! Applying fixes...');

    // 1. user_news columns
    try {
      await client.query(`ALTER TABLE user_news ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;`);
      console.log('✅ display_order column added');
    } catch (e) {}
    
    try {
      await client.query(`ALTER TABLE user_news ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;`);
      console.log('✅ view_count column added');
    } catch (e) {}

    try {
      await client.query(`ALTER TABLE user_news ADD COLUMN IF NOT EXISTS article_type VARCHAR(20) DEFAULT 'article';`);
      console.log('✅ article_type column added');
    } catch (e) {}

    // 2. Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        news_id INTEGER REFERENCES user_news(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ comments table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(comment_id, user_id)
      );
    `);
    console.log('✅ comment_likes table created');

    // 4. Create article_images table (with all required columns)
    await client.query(`
      CREATE TABLE IF NOT EXISTS article_images (
        id SERIAL PRIMARY KEY,
        article_id INTEGER REFERENCES user_news(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ article_images table created');

    // 4b. Fix existing article_images table if it has wrong column names
    try {
      await client.query(`ALTER TABLE article_images ADD COLUMN IF NOT EXISTS image_url TEXT;`);
      await client.query(`ALTER TABLE article_images ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;`);
      await client.query(`ALTER TABLE article_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
      // If old 'url' column exists, copy data and drop it
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='article_images' AND column_name='url') THEN
            UPDATE article_images SET image_url = url WHERE image_url IS NULL;
            ALTER TABLE article_images DROP COLUMN IF EXISTS url;
          END IF;
        END $$;
      `);
      console.log('✅ article_images columns fixed');
    } catch (e) { console.log('Info: article_images fix:', e.message); }

   // Remove foreign key constraint (articles can be in drafts OR user_news)
   try {
     await client.query(`ALTER TABLE article_images DROP CONSTRAINT IF EXISTS article_images_article_id_fkey;`);
     console.log('✅ article_images foreign key constraint removed');
   } catch (e) { console.log('Info:', e.message); }

    await client.query(`
      CREATE TABLE IF NOT EXISTS article_views (
        id SERIAL PRIMARY KEY,
        news_id INTEGER REFERENCES user_news(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ip_address TEXT,
        user_agent TEXT,
        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ article_views table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, following_id)
      );
    `);
    console.log('✅ user_follows table created');

    // CRITICAL: This creates the table your Bookmark model is looking for
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_articles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        news_id INTEGER REFERENCES user_news(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, news_id)
      );
    `);
    console.log('✅ saved_articles table created');

    // Fix 1: Remove article_images foreign key constraint (articles can be in drafts OR user_news)
    try {
      await client.query(`ALTER TABLE article_images DROP CONSTRAINT IF EXISTS article_images_article_id_fkey;`);
      console.log('✅ article_images foreign key constraint removed');
    } catch (e) { console.log('Info:', e.message); }

    // Fix 2: Add parent_id column to comments table (for nested comments)
    try {
      await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;`);
      console.log('✅ parent_id column added to comments');
    } catch (e) { console.log('Info:', e.message); }

    // Fix 3: For article_views, we'll handle duplicates in code instead of ON CONFLICT
    // (ON CONFLICT with NULLs is complex, so we'll skip it for now)
    console.log('✅ article_views - ON CONFLICT will be handled in application code');

    client.release();
    console.log('🎉 All database fixes applied!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing tables:', err);
    process.exit(1);
  }
};

fixTables();
