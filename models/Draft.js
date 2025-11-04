const pool = require('../config/database');

class Draft {
  // Create or update a draft
  static async upsert({ userId, title, content, category, imageUrl, tags }) {
    // Check if user already has a draft
    const existing = await pool.query(
      'SELECT id FROM drafts WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      // Update existing draft
      const result = await pool.query(
        `UPDATE drafts
         SET title = $1, content = $2, category = $3, image_url = $4, tags = $5, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $6
         RETURNING *`,
        [title || '', content || '', category || '', imageUrl || '', tags || [], userId]
      );
      return result.rows[0];
    } else {
      // Create new draft
      const result = await pool.query(
        `INSERT INTO drafts (user_id, title, content, category, image_url, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, title || '', content || '', category || '', imageUrl || '', tags || []]
      );
      return result.rows[0];
    }
  }

  // Get user's draft
  static async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM drafts
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  // Delete draft
  static async delete(userId) {
    const result = await pool.query(
      'DELETE FROM drafts WHERE user_id = $1 RETURNING *',
      [userId]
    );
    return result.rows[0];
  }

  // Publish draft (convert to news article and delete draft)
  static async publish(userId, UserNews) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get draft
      const draftResult = await client.query(
        'SELECT * FROM drafts WHERE user_id = $1',
        [userId]
      );

      if (draftResult.rows.length === 0) {
        throw new Error('Draft not found');
      }

      const draft = draftResult.rows[0];

      // Create news article
      const newsResult = await client.query(
        `INSERT INTO user_news (user_id, title, content, category, image_url, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, draft.title, draft.content, draft.category, draft.image_url, draft.tags]
      );

      // Delete draft
      await client.query('DELETE FROM drafts WHERE user_id = $1', [userId]);

      await client.query('COMMIT');

      return newsResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Draft;
