const pool = require('../config/database');

class ArticleImage {
  // Add a new image to an article
  static async addImage(articleId, imageUrl, caption = null, displayOrder = 0) {
    try {
      const result = await pool.query(
        `INSERT INTO article_images (article_id, image_url, caption, display_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id, article_id, image_url, caption, display_order, created_at, updated_at`,
        [articleId, imageUrl, caption, displayOrder]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all images for an article
  static async getArticleImages(articleId) {
    try {
      const result = await pool.query(
        `SELECT id, article_id, image_url, caption, display_order, created_at, updated_at
         FROM article_images
         WHERE article_id = $1
         ORDER BY display_order ASC`,
        [articleId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Update image caption
  static async updateCaption(imageId, caption) {
    try {
      const result = await pool.query(
        `UPDATE article_images
         SET caption = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, article_id, image_url, caption, display_order, created_at, updated_at`,
        [caption, imageId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete an image
  static async deleteImage(imageId) {
    try {
      const result = await pool.query(
        'DELETE FROM article_images WHERE id = $1 RETURNING id',
        [imageId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Reorder images for an article
  static async reorderImages(imageOrders) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const { id, display_order } of imageOrders) {
        await client.query(
          'UPDATE article_images SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [display_order, id]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get image by ID
  static async getImageById(imageId) {
    try {
      const result = await pool.query(
        'SELECT id, article_id, image_url, caption, display_order, created_at, updated_at FROM article_images WHERE id = $1',
        [imageId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get next display order for an article
  static async getNextDisplayOrder(articleId) {
    try {
      const result = await pool.query(
        'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM article_images WHERE article_id = $1',
        [articleId]
      );
      return result.rows[0].next_order;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ArticleImage;
