const pool = require('../../config/database');

// Get dashboard overview statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get overall statistics
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_this_week,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_this_month,
        (SELECT COUNT(*) FROM user_news) as total_articles,
        (SELECT COUNT(*) FROM user_news WHERE created_at >= NOW() - INTERVAL '7 days') as new_articles_this_week,
        (SELECT COUNT(*) FROM user_news WHERE created_at >= NOW() - INTERVAL '30 days') as new_articles_this_month,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT COUNT(*) FROM news_likes) as total_likes,
        (SELECT COUNT(*) FROM article_views) as total_views,
        (SELECT COUNT(*) FROM users WHERE is_banned = true) as banned_users
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Get growth data for charts (daily registrations, articles)
const getGrowthData = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // User growth
    const userGrowth = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Article growth
    const articleGrowth = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM user_news
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Comment growth
    const commentGrowth = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM comments
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      userGrowth: userGrowth.rows,
      articleGrowth: articleGrowth.rows,
      commentGrowth: commentGrowth.rows
    });
  } catch (error) {
    console.error('Error fetching growth data:', error);
    res.status(500).json({ error: 'Failed to fetch growth data' });
  }
};

// Get top performing articles
const getTopArticles = async (req, res) => {
  try {
    const { limit = 10, metric = 'views' } = req.query;

    let orderBy;
    switch (metric) {
      case 'likes':
        orderBy = 'like_count DESC';
        break;
      case 'comments':
        orderBy = 'comment_count DESC';
        break;
      case 'views':
      default:
        orderBy = 'view_count DESC';
    }

    const result = await pool.query(`
      SELECT
        un.id, un.title, un.category, un.created_at,
        u.username,
        (SELECT COUNT(*) FROM news_likes WHERE news_id = un.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE news_id = un.id) as comment_count,
        (SELECT COUNT(*) FROM article_views WHERE news_id = un.id) as view_count
      FROM user_news un
      JOIN users u ON un.user_id = u.id
      ORDER BY ${orderBy}
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching top articles:', error);
    res.status(500).json({ error: 'Failed to fetch top articles' });
  }
};

// Get most active users
const getTopUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        u.id, u.username, u.email, u.created_at, u.role,
        (SELECT COUNT(*) FROM user_news WHERE user_id = u.id) as article_count,
        (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count,
        (SELECT COUNT(*) FROM news_likes WHERE user_id = u.id) as like_count,
        (SELECT COUNT(*) FROM user_follows WHERE followed_id = u.id) as followers_count
      FROM users u
      ORDER BY article_count DESC, comment_count DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json({ error: 'Failed to fetch top users' });
  }
};

// Get category statistics
const getCategoryStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        category,
        COUNT(*) as article_count,
        SUM((SELECT COUNT(*) FROM news_likes WHERE news_id = user_news.id)) as total_likes,
        SUM((SELECT COUNT(*) FROM comments WHERE news_id = user_news.id)) as total_comments,
        SUM((SELECT COUNT(*) FROM article_views WHERE news_id = user_news.id)) as total_views
      FROM user_news
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY article_count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category statistics' });
  }
};

// Get recent activity
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent articles
    const articles = await pool.query(`
      SELECT 'article' as type, un.id, un.title as description, u.username, un.created_at
      FROM user_news un
      JOIN users u ON un.user_id = u.id
      ORDER BY un.created_at DESC
      LIMIT $1
    `, [Math.floor(limit / 3)]);

    // Get recent comments
    const comments = await pool.query(`
      SELECT 'comment' as type, c.id,
             CONCAT('Comment on "', un.title, '"') as description,
             u.username, c.created_at
      FROM comments c
      JOIN users u ON c.user_id = u.id
      JOIN user_news un ON c.news_id = un.id
      ORDER BY c.created_at DESC
      LIMIT $1
    `, [Math.floor(limit / 3)]);

    // Get recent users
    const users = await pool.query(`
      SELECT 'user' as type, id, CONCAT('New user: ', username) as description,
             username, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1
    `, [Math.floor(limit / 3)]);

    // Combine and sort
    const activity = [...articles.rows, ...comments.rows, ...users.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    res.json(activity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

module.exports = {
  getDashboardStats,
  getGrowthData,
  getTopArticles,
  getTopUsers,
  getCategoryStats,
  getRecentActivity
};
