const pool = require('../config/database');

class ArticleView {
  // Record a view for an article
  static async recordView(newsId, userId = null, ipAddress = null) {
    try {
      // Always insert a new view record (removed unique check)
      await pool.query(
        `INSERT INTO article_views (news_id, user_id, ip_address, viewed_at)
         VALUES ($1, $2, $3, NOW())`,
        [newsId, userId, ipAddress]
      );

      // Update the view count in user_news table based on TOTAL rows
      await pool.query(
        `UPDATE user_news
         SET view_count = (
           SELECT COUNT(*)
           FROM article_views
           WHERE news_id = $1
         )
         WHERE id = $1`,
        [newsId]
      );

      return true;
    } catch (error) {
      console.error('Error recording view:', error);
      return false;
    }
  }

  // Get view count for an article
  static async getViewCount(newsId) {
    const result = await pool.query(
      'SELECT view_count FROM user_news WHERE id = $1',
      [newsId]
    );
    return result.rows[0]?.view_count || 0;
  }

  // Get total views for a user's articles
  static async getUserTotalViews(userId) {
    const result = await pool.query(
      'SELECT SUM(view_count)::int as total_views FROM user_news WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.total_views || 0;
  }

  // Get most viewed articles
  static async getMostViewed(limit = 10) {
    const result = await pool.query(
      `SELECT un.*, u.username,
              (SELECT COUNT(*)::int FROM news_likes WHERE news_id = un.id) as like_count,
              (SELECT COUNT(*)::int FROM news_comments WHERE news_id = un.id) as comment_count
       FROM user_news un
       JOIN users u ON un.user_id = u.id
       WHERE un.view_count > 0
       ORDER BY un.view_count DESC, un.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Helper to get unique viewers count if needed for analytics
  static async getUniqueViewersCount(newsId) {
     const result = await pool.query(
      `SELECT COUNT(DISTINCT COALESCE(user_id::text, ip_address)) as unique_count
       FROM article_views
       WHERE news_id = $1`,
      [newsId]
    );
    return result.rows[0]?.unique_count || 0;
  }
}

module.exports = ArticleView;
