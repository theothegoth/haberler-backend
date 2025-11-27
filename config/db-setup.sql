

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  country_code VARCHAR(2) DEFAULT 'TR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User channels (many-to-many relationship between users and channels)
CREATE TABLE user_channels (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id VARCHAR(100) NOT NULL,
  channel_title VARCHAR(255) NOT NULL,
  last_checked TIMESTAMP DEFAULT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, channel_id)
);

-- Videos cache (global cache for all videos)
CREATE TABLE videos_cache (
  id SERIAL PRIMARY KEY,
  video_id VARCHAR(100) UNIQUE NOT NULL,
  channel_id VARCHAR(100) NOT NULL,
  channel_title VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  thumbnail VARCHAR(500),
  published_at TIMESTAMP NOT NULL,
  like_count INTEGER DEFAULT 0,
  category_id VARCHAR(10),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_user_channels_user_id ON user_channels(user_id);
CREATE INDEX idx_user_channels_channel_id ON user_channels(channel_id);
CREATE INDEX idx_videos_cache_video_id ON videos_cache(video_id);
CREATE INDEX idx_videos_cache_channel_id ON videos_cache(channel_id);
CREATE INDEX idx_videos_cache_published_at ON videos_cache(published_at DESC);
CREATE INDEX idx_videos_cache_like_count ON videos_cache(like_count DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
