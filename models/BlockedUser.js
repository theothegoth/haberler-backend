const pool = require('../config/database');

class BlockedUser {
  // Block a user
  static async block(blockerId, blockedId) {
    try {
      const result = await pool.query(
        'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) RETURNING *',
        [blockerId, blockedId]
      );
      return result.rows[0];
    } catch (err) {
      // If unique constraint violation (already blocked) or self-block check constraint
      if (err.code === '23505') {
        return null; // Already blocked
      }
      if (err.code === '23514') {
        throw new Error('Cannot block yourself');
      }
      throw err;
    }
  }

  // Unblock a user
  static async unblock(blockerId, blockedId) {
    const result = await pool.query(
      'DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2 RETURNING *',
      [blockerId, blockedId]
    );
    return result.rows.length > 0;
  }

  // Check if a user is blocked
  static async isBlocked(blockerId, blockedId) {
    const result = await pool.query(
      'SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );
    return result.rows.length > 0;
  }

  // Get all users blocked by a specific user
  static async getBlockedUsers(userId) {
    const result = await pool.query(
      `SELECT
        bu.id,
        bu.blocked_id,
        bu.created_at,
        u.username,
        u.profile_picture
       FROM blocked_users bu
       JOIN users u ON bu.blocked_id = u.id
       WHERE bu.blocker_id = $1
       ORDER BY bu.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Get list of user IDs that the current user has blocked (for filtering)
  static async getBlockedUserIds(userId) {
    const result = await pool.query(
      'SELECT blocked_id FROM blocked_users WHERE blocker_id = $1',
      [userId]
    );
    return result.rows.map(row => row.blocked_id);
  }
}

module.exports = BlockedUser;
