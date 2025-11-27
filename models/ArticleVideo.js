const pool = require('../config/database');

class ArticleVideo {
  /**
   * Add a video to an article/draft
   * @param {number} articleId - The article or draft ID
   * @param {string} videoId - The YouTube video ID
   * @param {number} displayOrder - Display order (default 0)
   * @returns {Promise<object>} The created article_video record with video details
   */
  static async addVideo(articleId, videoId, displayOrder = 0) {
    const result = await pool.query(
      `INSERT INTO article_videos (article_id, video_id, display_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [articleId, videoId, displayOrder]
    );
    return result.rows[0];
  }

  /**
   * Get all videos for an article/draft with full video details
   * @param {number} articleId - The article or draft ID
   * @returns {Promise<Array>} Array of videos with details from videos_cache
   */
  static async getArticleVideos(articleId) {
    const result = await pool.query(
      `SELECT
        av.*,
        vc.channel_id,
        vc.channel_title,
        vc.title,
        COALESCE(vc.max_res_thumbnail, vc.thumbnail) as thumbnail,
        vc.published_at,
        vc.like_count,
        vc.category_id
       FROM article_videos av
       LEFT JOIN videos_cache vc ON av.video_id = vc.video_id
       WHERE av.article_id = $1
       ORDER BY av.display_order ASC, av.created_at ASC`,
      [articleId]
    );
    return result.rows;
  }

  /**
   * Delete a video attachment
   * @param {number} id - The article_video ID
   * @returns {Promise<object>} The deleted record
   */
  static async deleteVideo(id) {
    const result = await pool.query(
      'DELETE FROM article_videos WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Get a single video attachment by ID
   * @param {number} id - The article_video ID
   * @returns {Promise<object>} The video attachment record
   */
  static async getVideoById(id) {
    const result = await pool.query(
      `SELECT
        av.*,
        vc.channel_id,
        vc.channel_title,
        vc.title,
        COALESCE(vc.max_res_thumbnail, vc.thumbnail) as thumbnail,
        vc.published_at,
        vc.like_count,
        vc.category_id
       FROM article_videos av
       LEFT JOIN videos_cache vc ON av.video_id = vc.video_id
       WHERE av.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Update display order of a video
   * @param {number} id - The article_video ID
   * @param {number} displayOrder - New display order
   * @returns {Promise<object>} The updated record
   */
  static async updateDisplayOrder(id, displayOrder) {
    const result = await pool.query(
      `UPDATE article_videos
       SET display_order = $2
       WHERE id = $1
       RETURNING *`,
      [id, displayOrder]
    );
    return result.rows[0];
  }

  /**
   * Count videos for an article
   * @param {number} articleId - The article or draft ID
   * @returns {Promise<number>} Count of videos
   */
  static async countArticleVideos(articleId) {
    const result = await pool.query(
      'SELECT COUNT(*)::int as count FROM article_videos WHERE article_id = $1',
      [articleId]
    );
    return result.rows[0].count;
  }

  /**
   * Copy videos from one article to another (used when publishing drafts)
   * @param {number} sourceArticleId - Source article/draft ID
   * @param {number} targetArticleId - Target article ID
   * @returns {Promise<Array>} Array of copied video records
   */
  static async copyVideos(sourceArticleId, targetArticleId) {
    const result = await pool.query(
      `INSERT INTO article_videos (article_id, video_id, display_order)
       SELECT $2, video_id, display_order
       FROM article_videos
       WHERE article_id = $1
       RETURNING *`,
      [sourceArticleId, targetArticleId]
    );
    return result.rows;
  }

  /**
   * Delete all videos for an article
   * @param {number} articleId - The article or draft ID
   * @returns {Promise<Array>} Array of deleted records
   */
  static async deleteAllArticleVideos(articleId) {
    const result = await pool.query(
      'DELETE FROM article_videos WHERE article_id = $1 RETURNING *',
      [articleId]
    );
    return result.rows;
  }
}

module.exports = ArticleVideo;
