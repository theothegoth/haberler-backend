const pool = require('../../config/database');

// Get all articles with pagination and filters
const getAllArticles = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', category = '', author = '' } = req.query;
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(un.title ILIKE $${paramIndex} OR un.content ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      conditions.push(`un.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (author) {
      conditions.push(`u.username ILIKE $${paramIndex}`);
      params.push(`%${author}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM user_news un
       JOIN users u ON un.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get articles
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT
        un.id, un.title, un.category, un.created_at, un.updated_at,
        u.id as user_id, u.username, u.email,
        (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1) as image_url,
        (SELECT COUNT(*) FROM news_likes WHERE news_id = un.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE news_id = un.id) as comment_count,
        (SELECT COUNT(*) FROM article_views WHERE news_id = un.id) as view_count,
        (SELECT COUNT(*) FROM article_videos WHERE article_id = un.id) as video_count
       FROM user_news un
       JOIN users u ON un.user_id = u.id
       ${whereClause}
       ORDER BY un.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      articles: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
};

// Get article by ID with full details
const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        un.*,
        u.id as user_id, u.username, u.email, u.profile_picture,
        (SELECT COUNT(*) FROM news_likes WHERE news_id = un.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE news_id = un.id) as comment_count,
        (SELECT COUNT(*) FROM article_views WHERE news_id = un.id) as view_count,
        (SELECT COUNT(*) FROM saved_articles WHERE news_id = un.id) as bookmark_count
       FROM user_news un
       JOIN users u ON un.user_id = u.id
       WHERE un.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Get article images
    const imagesResult = await pool.query(
      `SELECT image_url, display_order
       FROM article_images
       WHERE article_id = $1
       ORDER BY display_order ASC`,
      [id]
    );

    // Get article videos
    const videosResult = await pool.query(
      `SELECT av.*, vc.title, vc.thumbnail, vc.channel_title
       FROM article_videos av
       JOIN videos_cache vc ON av.video_id = vc.video_id
       WHERE av.article_id = $1
       ORDER BY av.display_order ASC`,
      [id]
    );

    // Get recent comments
    const commentsResult = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.username, u.id as user_id
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.news_id = $1
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      article: result.rows[0],
      images: imagesResult.rows,
      videos: videosResult.rows,
      recentComments: commentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching article details:', error);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
};

// Delete article
const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete article (cascade will handle related records)
    const result = await pool.query(
      'DELETE FROM user_news WHERE id = $1 RETURNING id, title',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      message: 'Article deleted successfully',
      article: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
};

// Get article statistics
const getArticleStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM user_news) as total_articles,
        (SELECT COUNT(*) FROM user_news WHERE created_at >= NOW() - INTERVAL '7 days') as articles_this_week,
        (SELECT COUNT(*) FROM user_news WHERE created_at >= NOW() - INTERVAL '30 days') as articles_this_month,
        (SELECT COUNT(DISTINCT category) FROM user_news) as total_categories,
        (SELECT category FROM user_news GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) as top_category
    `);

    // Get category distribution
    const categoryStats = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM user_news
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      stats: stats.rows[0],
      categoryDistribution: categoryStats.rows
    });
  } catch (error) {
    console.error('Error fetching article stats:', error);
    res.status(500).json({ error: 'Failed to fetch article statistics' });
  }
};

module.exports = {
  getAllArticles,
  getArticleById,
  deleteArticle,
  getArticleStats
};
