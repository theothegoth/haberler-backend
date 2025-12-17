const pool = require('../config/database');

class UserChannel {
  static async add(userId, channelId, channelTitle) {
    const result = await pool.query(
      'INSERT INTO user_channels (user_id, channel_id, channel_title) VALUES ($1, $2, $3) ON CONFLICT (user_id, channel_id) DO NOTHING RETURNING *',
      [userId, channelId, channelTitle]
    );
    return result.rows[0];
  }

  static async remove(userId, channelId) {
    const result = await pool.query(
      'DELETE FROM user_channels WHERE user_id = $1 AND channel_id = $2 RETURNING *',
      [userId, channelId]
    );
    return result.rows[0];
  }

  static async getUserChannels(userId) {
    const result = await pool.query(
      'SELECT * FROM user_channels WHERE user_id = $1 ORDER BY added_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async updateLastChecked(userId, channelId) {
    const result = await pool.query(
      'UPDATE user_channels SET last_checked = CURRENT_TIMESTAMP WHERE user_id = $1 AND channel_id = $2 RETURNING *',
      [userId, channelId]
    );
    return result.rows[0];
  }

  static async getChannelsToUpdate(userId, hoursThreshold = 1) {
    const result = await pool.query(
      `SELECT * FROM user_channels
       WHERE user_id = $1
       AND (last_checked IS NULL OR last_checked < NOW() - INTERVAL '${hoursThreshold} hours')
       ORDER BY last_checked ASC NULLS FIRST`,
      [userId]
    );
    return result.rows;
  }

  static async getAllUniqueChannels() {
    const result = await pool.query(
      'SELECT DISTINCT channel_id, channel_title FROM user_channels'
    );
    return result.rows;
  }
}

module.exports = UserChannel;
