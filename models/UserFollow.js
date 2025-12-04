const pool = require('../config/database');

class UserFollow {
  static async follow(followerId, followedId) {
    if (followerId === followedId) {
      throw new Error('Cannot follow yourself');
    }

    try {
      const result = await pool.query(
        `INSERT INTO user_follows (follower_id, followed_id, created_at)
         VALUES ($1, $2, NOW())
         RETURNING *`,
        [followerId, followedId]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Already following this user');
      }
      throw error;
    }
  }

  static async unfollow(followerId, followedId) {
    const result = await pool.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND followed_id = $2 RETURNING *',
      [followerId, followedId]
    );
    return result.rows[0];
  }

  static async isFollowing(followerId, followedId) {
    const result = await pool.query(
      'SELECT COUNT(*) > 0 as is_following FROM user_follows WHERE follower_id = $1 AND followed_id = $2',
      [followerId, followedId]
    );
    return result.rows[0].is_following;
  }

  static async getFollowers(userId) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at, uf.created_at as followed_at
       FROM user_follows uf
       JOIN users u ON uf.follower_id = u.id
       WHERE uf.followed_id = $1
       ORDER BY uf.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getFollowing(userId) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at, uf.created_at as followed_at,
              (SELECT COUNT(*) FROM user_news WHERE user_id = u.id) as news_count
       FROM user_follows uf
       JOIN users u ON uf.followed_id = u.id
       WHERE uf.follower_id = $1
       ORDER BY uf.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getFollowCounts(userId) {
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM user_follows WHERE followed_id = $1) as followers_count,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1) as following_count`,
      [userId]
    );
    return result.rows[0];
  }

  static async getSuggestedUsers(userId, limit = 10) {
    // Get users that the current user is not following
    const result = await pool.query(
      `SELECT u.id, u.username, u.created_at,
              (SELECT COUNT(*) FROM user_news WHERE user_id = u.id) as news_count,
              (SELECT COUNT(*) FROM user_follows WHERE followed_id = u.id) as followers_count
       FROM users u
       WHERE u.id != $1
       AND u.username != 'Deleted User'
       AND u.username != 'admin'
       AND u.id NOT IN (SELECT followed_id FROM user_follows WHERE follower_id = $1)
       ORDER BY followers_count DESC, news_count DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}

module.exports = UserFollow;
