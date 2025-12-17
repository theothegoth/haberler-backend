const { Client } = require('pg');
require('dotenv').config();

async function addNewsSystem() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create user_news table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_news (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100),
        image_url TEXT,
        tags TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✓ user_news table created');

    // Create user_follows table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        followed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(follower_id, followed_id)
      )
    `);
    console.log('✓ user_follows table created');

    // Create news_likes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS news_likes (
        id SERIAL PRIMARY KEY,
        news_id INTEGER NOT NULL REFERENCES user_news(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(news_id, user_id)
      )
    `);
    console.log('✓ news_likes table created');

    // Create news_comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS news_comments (
        id SERIAL PRIMARY KEY,
        news_id INTEGER NOT NULL REFERENCES user_news(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✓ news_comments table created');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_news_user_id ON user_news(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_news_created_at ON user_news(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id);
      CREATE INDEX IF NOT EXISTS idx_news_likes_news_id ON news_likes(news_id);
      CREATE INDEX IF NOT EXISTS idx_news_likes_user_id ON news_likes(user_id);
      CREATE INDEX IF NOT EXISTS idx_news_comments_news_id ON news_comments(news_id);
    `);
    console.log('✓ Indexes created');

    console.log('\n✅ News system tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating news system tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addNewsSystem();
