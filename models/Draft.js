const pool = require('../config/database');

const MAX_DRAFTS_PER_USER = 3;

class Draft {
  // Create a new draft
  static async create({ userId, title, content, category, tags, articleType }) {
    // Check if user has reached the maximum number of drafts
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM drafts WHERE user_id = $1',
      [userId]
    );

    const draftCount = parseInt(countResult.rows[0].count);

    if (draftCount >= MAX_DRAFTS_PER_USER) {
      throw new Error(`Maximum ${MAX_DRAFTS_PER_USER} drafts allowed per user`);
    }

    // Create new draft
    const result = await pool.query(
      `INSERT INTO drafts (user_id, title, content, category, tags, article_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title || '', content || '', category || '', tags || [], articleType || 'news']
    );
    return result.rows[0];
  }

  // Update an existing draft
  static async update({ draftId, userId, title, content, category, tags, articleType }) {
    const result = await pool.query(
      `UPDATE drafts
       SET title = $1, content = $2, category = $3, tags = $4, article_type = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title || '', content || '', category || '', tags || [], articleType || 'news', draftId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Draft not found or unauthorized');
    }

    return result.rows[0];
  }

  // Get all drafts for a user
  static async findAllByUserId(userId) {
    const result = await pool.query(
      `SELECT d.*,
              (SELECT image_url FROM article_images WHERE article_id = d.id ORDER BY display_order ASC LIMIT 1) as image_url,
              (SELECT COUNT(*)::int FROM article_videos WHERE article_id = d.id) as video_count
       FROM drafts d
       WHERE d.user_id = $1
       ORDER BY d.updated_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // Get a single draft by ID
  static async findById(draftId, userId) {
    const result = await pool.query(
      `SELECT * FROM drafts
       WHERE id = $1 AND user_id = $2`,
      [draftId, userId]
    );
    return result.rows[0];
  }

  // Delete a specific draft
  static async delete(draftId, userId) {
    const result = await pool.query(
      'DELETE FROM drafts WHERE id = $1 AND user_id = $2 RETURNING *',
      [draftId, userId]
    );
    return result.rows[0];
  }

  // Publish draft (convert to news article and delete draft)
  static async publish(draftId, userId, UserNews) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get draft
      const draftResult = await client.query(
        'SELECT * FROM drafts WHERE id = $1 AND user_id = $2',
        [draftId, userId]
      );

      if (draftResult.rows.length === 0) {
        throw new Error('Draft not found');
      }

      const draft = draftResult.rows[0];

      // Create news article
      const newsResult = await client.query(
        `INSERT INTO user_news (user_id, title, content, category, tags, article_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, draft.title, draft.content, draft.category, draft.tags, draft.article_type || 'news']
      );

      const newArticleId = newsResult.rows[0].id;

      // Transfer images from draft to new article
      await client.query(
        'UPDATE article_images SET article_id = $1 WHERE article_id = $2',
        [newArticleId, draftId]
      );

      // Transfer videos from draft to new article
      await client.query(
        'UPDATE article_videos SET article_id = $1 WHERE article_id = $2',
        [newArticleId, draftId]
      );

      // Delete draft
      await client.query('DELETE FROM drafts WHERE id = $1 AND user_id = $2', [draftId, userId]);

      await client.query('COMMIT');

      return newsResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get draft count for a user
  static async getCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM drafts WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = Draft;
