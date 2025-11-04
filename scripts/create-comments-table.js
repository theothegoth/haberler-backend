const pool = require('../config/database');

const createCommentsTable = async () => {
  try {
    console.log('Creating comments table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        news_id INTEGER NOT NULL REFERENCES user_news(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_news_id ON comments(news_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
    `);

    console.log('✅ Comments table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating comments table:', error.message);
    process.exit(1);
  }
};

createCommentsTable();
