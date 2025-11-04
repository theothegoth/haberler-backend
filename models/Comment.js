const pool = require('../config/database');

class Comment {
  static async create(newsId, userId, content) {
    const result = await pool.query(
      `INSERT INTO comments (news_id, user_id, content, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, news_id, user_id, content, created_at`,
      [newsId, userId, content]
    );
    return result.rows[0];
  }

  static async getByNewsId(newsId) {
    const result = await pool.query(
      `SELECT
        c.id,
        c.news_id,
        c.user_id,
        c.content,
        c.created_at,
        u.username,
        u.profile_picture
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.news_id = $1
       ORDER BY c.created_at DESC`,
      [newsId]
    );
    return result.rows;
  }

  static async delete(commentId, userId) {
    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [commentId, userId]
    );
    return result.rows[0];
  }

  static async getCount(newsId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE news_id = $1',
      [newsId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = Comment;
