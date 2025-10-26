const pool = require('../config/database');

class VideoCache {
  static async add(videoData) {
    const {
      videoId,
      channelId,
      channelTitle,
      title,
      thumbnail,
      publishedAt,
      likeCount = 0,
      categoryId = null
    } = videoData;

    const result = await pool.query(
      `INSERT INTO videos_cache
       (video_id, channel_id, channel_title, title, thumbnail, published_at, like_count, category_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (video_id)
       DO UPDATE SET
         like_count = EXCLUDED.like_count,
         category_id = EXCLUDED.category_id,
         last_updated = CURRENT_TIMESTAMP
       RETURNING *`,
      [videoId, channelId, channelTitle, title, thumbnail, publishedAt, likeCount, categoryId]
    );
    return result.rows[0];
  }

  static async addBatch(videosData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];

      for (const video of videosData) {
        const result = await client.query(
          `INSERT INTO videos_cache
           (video_id, channel_id, channel_title, title, thumbnail, published_at, like_count, category_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (video_id)
           DO UPDATE SET
             like_count = EXCLUDED.like_count,
             category_id = EXCLUDED.category_id,
             last_updated = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            video.videoId,
            video.channelId,
            video.channelTitle,
            video.title,
            video.thumbnail,
            video.publishedAt,
            video.likeCount || 0,
            video.categoryId || null
          ]
        );
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getByChannelIds(channelIds, hoursLimit = 48) {
    const result = await pool.query(
      `SELECT * FROM videos_cache
       WHERE channel_id = ANY($1)
       AND published_at > NOW() - INTERVAL '${hoursLimit} hours'
       ORDER BY like_count DESC, published_at DESC`,
      [channelIds]
    );
    return result.rows;
  }

  static async getByVideoId(videoId) {
    const result = await pool.query(
      'SELECT * FROM videos_cache WHERE video_id = $1',
      [videoId]
    );
    return result.rows[0];
  }

  static async getRecent(hoursLimit = 48, categoryId = null) {
    let query = `SELECT * FROM videos_cache
                 WHERE published_at > NOW() - INTERVAL '${hoursLimit} hours'`;
    const params = [];

    if (categoryId) {
      query += ' AND category_id = $1';
      params.push(categoryId);
    }

    query += ' ORDER BY like_count DESC, published_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async updateStats(videoId, likeCount, categoryId) {
    const result = await pool.query(
      `UPDATE videos_cache
       SET like_count = $1, category_id = $2, last_updated = CURRENT_TIMESTAMP
       WHERE video_id = $3
       RETURNING *`,
      [likeCount, categoryId, videoId]
    );
    return result.rows[0];
  }

  static async cleanOldVideos(hoursThreshold = 48) {
    const result = await pool.query(
      `DELETE FROM videos_cache
       WHERE published_at < NOW() - INTERVAL '${hoursThreshold} hours'
       RETURNING *`
    );
    return result.rows;
  }

  static async exists(videoId) {
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM videos_cache WHERE video_id = $1)',
      [videoId]
    );
    return result.rows[0].exists;
  }
}

module.exports = VideoCache;
