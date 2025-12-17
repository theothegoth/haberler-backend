const pool = require('./database');
const { Logger } = require('../utils/logger');

const logger = new Logger('DATABASE');

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        country_code VARCHAR(2) DEFAULT 'TR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);

    logger.info('Creating user_channels table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_channels (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel_id VARCHAR(100) NOT NULL,
        channel_title VARCHAR(255) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_checked TIMESTAMP,
        UNIQUE(user_id, channel_id)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_channels_user_id ON user_channels(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_channels_channel_id ON user_channels(channel_id)
    `);

    logger.info('Creating videos_cache table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos_cache (
        id SERIAL PRIMARY KEY,
        video_id VARCHAR(20) UNIQUE NOT NULL,
        channel_id VARCHAR(100) NOT NULL,
        channel_title VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        thumbnail VARCHAR(500),
        published_at TIMESTAMP NOT NULL,
        like_count INTEGER DEFAULT 0,
        category_id VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_cache_video_id ON videos_cache(video_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_cache_channel_id ON videos_cache(channel_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_cache_published_at ON videos_cache(published_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_cache_category_id ON videos_cache(category_id)
    `);

    logger.info('Creating updated_at trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users
    `);
    await client.query(`
      CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query('COMMIT');
    logger.info('All tables created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

const checkConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
};

const initializeDatabase = async () => {
  logger.info('Initializing database...');

  const isConnected = await checkConnection();
  if (!isConnected) {
    throw new Error('Cannot connect to database');
  }

  await createTables();
  logger.info('Database initialization complete!');
};

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      logger.info('Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeDatabase,
  checkConnection,
  createTables
};
