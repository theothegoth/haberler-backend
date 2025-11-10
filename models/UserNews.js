const pool = require('../config/database');

class UserNews {
  static async create({ userId, title, content, category, imageUrl, tags }) {
    const result = await pool.query(
      `INSERT INTO user_news (user_id, title, content, category, image_url, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [userId, title, content, category, imageUrl, tags]
    );
    return result.rows[0];
  }

  static async findById(newsId, userId = null) {
    const result = await pool.query(
      `SELECT un.*, u.username, u.email,
              (SELECT COUNT(*)::int FROM news_likes WHERE news_id = un.id) as like_count,
              (SELECT COUNT(*)::int FROM news_comments WHERE news_id = un.id) as comment_count,
              EXISTS(SELECT 1 FROM news_likes WHERE news_id = un.id AND user_id = $2) as user_has_liked
       FROM user_news un
       JOIN users u ON un.user_id = u.id
       WHERE un.id = $1`,
      [newsId, userId]
    );
    return result.rows[0];
  }

  static async findByUserId(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT un.*, u.username,
              (SELECT COUNT(*)::int FROM news_likes WHERE news_id = un.id) as like_count,
              (SELECT COUNT(*)::int FROM news_comments WHERE news_id = un.id) as comment_count
       FROM user_news un
       JOIN users u ON un.user_id = u.id
       WHERE un.user_id = $1
       ORDER BY un.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async getNewsFeed(userId, limit = 20, offset = 0) {
    // Get news from users that the current user follows AND the user's own posts
    // Exclude posts from blocked users
    const result = await pool.query(
      `SELECT un.*, u.username,
              (SELECT COUNT(*)::int FROM news_likes WHERE news_id = un.id) as like_count,
              (SELECT COUNT(*)::int FROM news_comments WHERE news_id = un.id) as comment_count,
              (SELECT COUNT(*)::int > 0 FROM news_likes WHERE news_id = un.id AND user_id = $1) as user_has_liked
       FROM user_news un
       JOIN users u ON un.user_id = u.id
       WHERE (un.user_id = $1
          OR un.user_id IN (
            SELECT followed_id FROM user_follows WHERE follower_id = $1
          ))
          AND un.user_id NOT IN (
            SELECT blocked_id FROM blocked_users WHERE blocker_id = $1
          )
       ORDER BY un.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async getAllPublic(limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT un.*, u.username,
              (SELECT COUNT(*)::int FROM news_likes WHERE news_id = un.id) as like_count,
              (SELECT COUNT(*)::int FROM news_comments WHERE news_id = un.id) as comment_count
       FROM user_news un
       JOIN users u ON un.user_id = u.id
       ORDER BY un.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async update(newsId, userId, { title, content, category, imageUrl, tags }) {
    const result = await pool.query(
      `UPDATE user_news
       SET title = $1, content = $2, category = $3, image_url = $4, tags = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, content, category, imageUrl, tags, newsId, userId]
    );
    return result.rows[0];
  }

  static async delete(newsId, userId) {
    const result = await pool.query(
      'DELETE FROM user_news WHERE id = $1 AND user_id = $2 RETURNING *',
      [newsId, userId]
    );
    return result.rows[0];
  }

  static async likeNews(newsId, userId) {
    try {
      await pool.query(
        'INSERT INTO news_likes (news_id, user_id, created_at) VALUES ($1, $2, NOW())',
        [newsId, userId]
      );
      return true;
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return false;
      }
      throw error;
    }
  }

  static async unlikeNews(newsId, userId) {
    const result = await pool.query(
      'DELETE FROM news_likes WHERE news_id = $1 AND user_id = $2',
      [newsId, userId]
    );
    return result.rowCount > 0;
  }

  static async advancedSearch({ query, categories, author, tags, startDate, endDate, sortBy, limit, offset }) {
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (query) {
      conditions.push(`(un.title ILIKE \$${paramIndex} OR un.content ILIKE \$${paramIndex})`);
      params.push(`%${query}%`);
      paramIndex++;
    }

    if (categories && categories.length > 0) {
      const categoryPlaceholders = categories.map((_, i) => `\$${paramIndex + i}`).join(',');
      conditions.push(`un.category IN (${categoryPlaceholders})`);
      params.push(...categories);
      paramIndex += categories.length;
    }

    if (author) {
      conditions.push(`u.username ILIKE \$${paramIndex}`);
      params.push(`%${author}%`);
      paramIndex++;
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map((_, i) => `\$${paramIndex + i} = ANY(un.tags)`).join(' OR ');
      conditions.push(`(${tagConditions})`);
      params.push(...tags);
      paramIndex += tags.length;
    }

    if (startDate) {
      conditions.push(`un.created_at >= \$${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`un.created_at <= \$${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy;
    switch (sortBy) {
      case 'popularity':
        orderBy = 'ORDER BY like_count DESC, view_count DESC, un.created_at DESC';
        break;
      case 'relevance':
        if (query) {
          orderBy = `ORDER BY CASE WHEN un.title ILIKE \ THEN 1 WHEN un.content ILIKE \ THEN 2 ELSE 3 END, like_count DESC, un.created_at DESC`;
        } else {
          orderBy = 'ORDER BY like_count DESC, un.created_at DESC';
        }
        break;
      case 'date':
      default:
        orderBy = 'ORDER BY un.created_at DESC';
    }

    params.push(limit, offset);

    const sql = `
      SELECT 
        un.*,
        u.username,
        (SELECT COUNT(*)::int FROM news_likes WHERE news_id = un.id) as like_count,
        (SELECT COUNT(*)::int FROM news_comments WHERE news_id = un.id) as comment_count
      FROM user_news un
      JOIN users u ON un.user_id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT \$${paramIndex} OFFSET \$${paramIndex + 1}
    `;

    const result = await pool.query(sql, params);
    return result.rows;
  }
}

module.exports = UserNews;
