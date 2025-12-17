const pool = require('../config/database');

class Comment {
  // Create a new comment or reply
  static async create(newsId, userId, content, parentId = null) {
    // If parentId is provided, verify the parent comment exists and has no parent (only 1 level deep)
    if (parentId) {
      const parentCheck = await pool.query(
        'SELECT id, parent_id FROM comments WHERE id = $1',
        [parentId]
      );

      if (parentCheck.rows.length === 0) {
        throw new Error('Parent comment not found');
      }

      if (parentCheck.rows[0].parent_id !== null) {
        throw new Error('Cannot reply to a reply - only 1 level of nesting allowed');
      }
    }

    const result = await pool.query(
      `INSERT INTO comments (news_id, user_id, content, parent_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, news_id, user_id, content, parent_id, created_at`,
      [newsId, userId, content, parentId]
    );
    return result.rows[0];
  }

  // Get comments for a news article with likes and replies
  // Sorted by: like_count DESC, then created_at DESC
  static async getByNewsId(newsId, userId = null) {
    const result = await pool.query(
      `SELECT
        c.id,
        c.news_id,
        c.user_id,
        c.content,
        c.parent_id,
        c.created_at,
        u.username,
        u.profile_picture,
        COALESCE(like_counts.like_count, 0)::int as like_count,
        CASE WHEN $2::int IS NOT NULL AND user_likes.user_id IS NOT NULL THEN true ELSE false END as user_has_liked
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN (
         SELECT comment_id, COUNT(*)::int as like_count
         FROM comment_likes
         GROUP BY comment_id
       ) like_counts ON c.id = like_counts.comment_id
       LEFT JOIN comment_likes user_likes ON c.id = user_likes.comment_id AND user_likes.user_id = $2
       WHERE c.news_id = $1 AND c.parent_id IS NULL
       ORDER BY like_count DESC, c.created_at DESC`,
      [newsId, userId]
    );

    // For each top-level comment, get its replies
    const comments = result.rows;
    for (let comment of comments) {
      comment.replies = await this.getReplies(comment.id, userId);
    }

    return comments;
  }

  // Get replies for a comment (sorted same way)
  static async getReplies(parentId, userId = null) {
    const result = await pool.query(
      `SELECT
        c.id,
        c.news_id,
        c.user_id,
        c.content,
        c.parent_id,
        c.created_at,
        u.username,
        u.profile_picture,
        COALESCE(like_counts.like_count, 0)::int as like_count,
        CASE WHEN $2::int IS NOT NULL AND user_likes.user_id IS NOT NULL THEN true ELSE false END as user_has_liked
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN (
         SELECT comment_id, COUNT(*)::int as like_count
         FROM comment_likes
         GROUP BY comment_id
       ) like_counts ON c.id = like_counts.comment_id
       LEFT JOIN comment_likes user_likes ON c.id = user_likes.comment_id AND user_likes.user_id = $2
       WHERE c.parent_id = $1
       ORDER BY like_count DESC, c.created_at DESC`,
      [parentId, userId]
    );
    return result.rows;
  }

  // Like a comment
  static async like(commentId, userId) {
    try {
      await pool.query(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
        [commentId, userId]
      );
      return true;
    } catch (err) {
      // Unique constraint violation means already liked
      if (err.code === '23505') {
        return false;
      }
      throw err;
    }
  }

  // Unlike a comment
  static async unlike(commentId, userId) {
    const result = await pool.query(
      'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2 RETURNING id',
      [commentId, userId]
    );
    return result.rows.length > 0;
  }

  // Delete a comment (and all its replies due to CASCADE)
  static async delete(commentId, userId) {
    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [commentId, userId]
    );
    return result.rows[0];
  }

  // Get total comment count for a news article (including replies)
  static async getCount(newsId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE news_id = $1',
      [newsId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = Comment;
