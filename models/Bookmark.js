const pool = require('../config/database');

class Bookmark {
  // Save/bookmark an article
  static async save(userId, newsId) {
    try {
      const result = await pool.query(
        `INSERT INTO saved_articles (user_id, news_id, created_at)
         VALUES ($1, $2, NOW())
         RETURNING id, user_id, news_id, created_at`,
        [userId, newsId]
      );
      return result.rows[0];
    } catch (error) {
      // If unique constraint violation (already saved), ignore
      if (error.code === '23505') {
        return null;
      }
      throw error;
    }
  }

  // Remove bookmark
  static async unsave(userId, newsId) {
    const result = await pool.query(
      'DELETE FROM saved_articles WHERE user_id = $1 AND news_id = $2 RETURNING id',
      [userId, newsId]
    );
    return result.rows[0];
  }

  // Check if article is saved by user
  static async isSaved(userId, newsId) {
    const result = await pool.query(
      'SELECT id FROM saved_articles WHERE user_id = $1 AND news_id = $2',
      [userId, newsId]
    );
    return result.rows.length > 0;
  }

  // Get all saved articles for a user
  static async getSavedArticles(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT
        un.id, un.title, un.content, un.image_url, un.category, un.created_at,
        u.id as user_id, u.username, u.email,
        (SELECT COUNT(*) FROM news_likes WHERE news_id = un.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE news_id = un.id) as comment_count,
        EXISTS(SELECT 1 FROM news_likes WHERE news_id = un.id AND user_id = $1) as user_has_liked,
        sa.created_at as saved_at
       FROM saved_articles sa
       JOIN user_news un ON sa.news_id = un.id
       JOIN users u ON un.user_id = u.id
       WHERE sa.user_id = $1
       ORDER BY sa.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  // Get count of saved articles
  static async getCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM saved_articles WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = Bookmark;
