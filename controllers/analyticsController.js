const pool = require('../config/database');

// Get author's analytics overview
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    // Get total stats
    const statsQuery = `
      SELECT
        COUNT(DISTINCT un.id) as total_articles,
        COALESCE(SUM(un.view_count), 0) as total_views,
        COUNT(DISTINCT nl.id) as total_likes,
        COUNT(DISTINCT c.id) as total_comments,
        COUNT(DISTINCT uf.follower_id) as total_followers
      FROM user_news un
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      LEFT JOIN user_follows uf ON uf.followed_id = $1
      WHERE un.user_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [userId]);
    const stats = statsResult.rows[0];

    // Get recent performance (last 30 days)
    const recentQuery = `
      SELECT
        COUNT(DISTINCT un.id) as articles_published,
        COALESCE(SUM(un.view_count), 0) as views,
        COUNT(DISTINCT nl.id) as likes,
        COUNT(DISTINCT c.id) as comments
      FROM user_news un
      LEFT JOIN news_likes nl ON un.id = nl.news_id AND nl.created_at >= NOW() - INTERVAL '30 days'
      LEFT JOIN comments c ON un.id = c.news_id AND c.created_at >= NOW() - INTERVAL '30 days'
      WHERE un.user_id = $1 AND un.created_at >= NOW() - INTERVAL '30 days'
    `;

    const recentResult = await pool.query(recentQuery, [userId]);
    const recentStats = recentResult.rows[0];

    // Calculate engagement rate
    const totalViews = parseInt(stats.total_views) || 0;
    const totalEngagement = (parseInt(stats.total_likes) || 0) + (parseInt(stats.total_comments) || 0);
    const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : 0;

    res.json({
      overview: {
        totalArticles: parseInt(stats.total_articles) || 0,
        totalViews: totalViews,
        totalLikes: parseInt(stats.total_likes) || 0,
        totalComments: parseInt(stats.total_comments) || 0,
        totalFollowers: parseInt(stats.total_followers) || 0,
        engagementRate: parseFloat(engagementRate)
      },
      last30Days: {
        articlesPublished: parseInt(recentStats.articles_published) || 0,
        views: parseInt(recentStats.views) || 0,
        likes: parseInt(recentStats.likes) || 0,
        comments: parseInt(recentStats.comments) || 0
      }
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get article views over time
exports.getViewsOverTime = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { days = 30 } = req.query;

    const query = `
      SELECT
        DATE(av.viewed_at) as date,
        COUNT(*) as views
      FROM article_views av
      JOIN user_news un ON av.news_id = un.id
      WHERE un.user_id = $1
        AND av.viewed_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(av.viewed_at)
      ORDER BY date ASC
    `;

    const result = await pool.query(query, [userId]);

    // Fill in missing dates with zero views
    const viewsMap = {};
    result.rows.forEach(row => {
      viewsMap[row.date.toISOString().split('T')[0]] = parseInt(row.views);
    });

    const filledData = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    for (let i = 0; i < parseInt(days); i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      filledData.push({
        date: dateStr,
        views: viewsMap[dateStr] || 0
      });
    }

    res.json(filledData);
  } catch (error) {
    console.error('Get views over time error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get engagement metrics breakdown
exports.getEngagementMetrics = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { days = 30 } = req.query;

    const query = `
      WITH date_series AS (
        SELECT generate_series(
          NOW() - INTERVAL '${parseInt(days)} days',
          NOW(),
          '1 day'::interval
        )::date as date
      ),
      likes_data AS (
        SELECT
          DATE(nl.created_at) as date,
          COUNT(*) as count
        FROM news_likes nl
        JOIN user_news un ON nl.news_id = un.id
        WHERE un.user_id = $1
          AND nl.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY DATE(nl.created_at)
      ),
      comments_data AS (
        SELECT
          DATE(c.created_at) as date,
          COUNT(*) as count
        FROM comments c
        JOIN user_news un ON c.news_id = un.id
        WHERE un.user_id = $1
          AND c.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY DATE(c.created_at)
      )
      SELECT
        ds.date,
        COALESCE(ld.count, 0) as likes,
        COALESCE(cd.count, 0) as comments
      FROM date_series ds
      LEFT JOIN likes_data ld ON ds.date = ld.date
      LEFT JOIN comments_data cd ON ds.date = cd.date
      ORDER BY ds.date ASC
    `;

    const result = await pool.query(query, [userId]);

    const formattedData = result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      likes: parseInt(row.likes),
      comments: parseInt(row.comments)
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Get engagement metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get follower growth over time
exports.getFollowerGrowth = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { days = 30 } = req.query;

    const query = `
      WITH date_series AS (
        SELECT generate_series(
          NOW() - INTERVAL '${parseInt(days)} days',
          NOW(),
          '1 day'::interval
        )::date as date
      ),
      daily_follows AS (
        SELECT
          DATE(created_at) as date,
          COUNT(*) as new_followers
        FROM user_follows
        WHERE followed_id = $1
          AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        GROUP BY DATE(created_at)
      )
      SELECT
        ds.date,
        COALESCE(df.new_followers, 0) as new_followers,
        (
          SELECT COUNT(*)
          FROM user_follows
          WHERE followed_id = $1
            AND created_at <= ds.date
        ) as total_followers
      FROM date_series ds
      LEFT JOIN daily_follows df ON ds.date = df.date
      ORDER BY ds.date ASC
    `;

    const result = await pool.query(query, [userId]);

    const formattedData = result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      newFollowers: parseInt(row.new_followers),
      totalFollowers: parseInt(row.total_followers)
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Get follower growth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get popular articles
exports.getPopularArticles = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { limit = 10, sortBy = 'views' } = req.query;

    let orderByClause;
    switch (sortBy) {
      case 'likes':
        orderByClause = 'likes_count DESC';
        break;
      case 'comments':
        orderByClause = 'comments_count DESC';
        break;
      case 'engagement':
        orderByClause = '(likes_count + comments_count) DESC';
        break;
      case 'views':
      default:
        orderByClause = 'view_count DESC';
    }

    const query = `
      SELECT
        un.id,
        un.title,
        un.category,
        un.view_count,
        un.created_at,
        COUNT(DISTINCT nl.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        (COUNT(DISTINCT nl.id) + COUNT(DISTINCT c.id)) as engagement_score
      FROM user_news un
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      WHERE un.user_id = $1
      GROUP BY un.id, un.title, un.category, un.view_count, un.created_at
      ORDER BY ${orderByClause}
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, parseInt(limit)]);

    const articles = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      views: parseInt(row.view_count) || 0,
      likes: parseInt(row.likes_count) || 0,
      comments: parseInt(row.comments_count) || 0,
      engagementScore: parseInt(row.engagement_score) || 0,
      publishedAt: row.created_at
    }));

    res.json(articles);
  } catch (error) {
    console.error('Get popular articles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get article performance details
exports.getArticlePerformance = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { newsId } = req.params;

    // Verify article belongs to user
    const ownerCheck = await pool.query(
      'SELECT id FROM user_news WHERE id = $1 AND user_id = $2',
      [newsId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Get article stats
    const statsQuery = `
      SELECT
        un.id,
        un.title,
        un.view_count,
        un.created_at,
        COUNT(DISTINCT nl.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count
      FROM user_news un
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      WHERE un.id = $1
      GROUP BY un.id, un.title, un.view_count, un.created_at
    `;

    const statsResult = await pool.query(statsQuery, [newsId]);
    const stats = statsResult.rows[0];

    // Get views over time for this article (last 30 days)
    const viewsQuery = `
      SELECT
        DATE(viewed_at) as date,
        COUNT(*) as views
      FROM article_views
      WHERE news_id = $1
        AND viewed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(viewed_at)
      ORDER BY date ASC
    `;

    const viewsResult = await pool.query(viewsQuery, [newsId]);

    // Fill in missing dates
    const viewsMap = {};
    viewsResult.rows.forEach(row => {
      viewsMap[row.date.toISOString().split('T')[0]] = parseInt(row.views);
    });

    const viewsData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      viewsData.push({
        date: dateStr,
        views: viewsMap[dateStr] || 0
      });
    }

    res.json({
      article: {
        id: stats.id,
        title: stats.title,
        publishedAt: stats.created_at
      },
      stats: {
        views: parseInt(stats.view_count) || 0,
        likes: parseInt(stats.likes_count) || 0,
        comments: parseInt(stats.comments_count) || 0
      },
      viewsOverTime: viewsData
    });
  } catch (error) {
    console.error('Get article performance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get top categories by performance
exports.getTopCategories = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    const query = `
      SELECT
        un.category,
        COUNT(DISTINCT un.id) as article_count,
        COALESCE(SUM(un.view_count), 0) as total_views,
        COUNT(DISTINCT nl.id) as total_likes,
        COUNT(DISTINCT c.id) as total_comments
      FROM user_news un
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      WHERE un.user_id = $1
      GROUP BY un.category
      ORDER BY total_views DESC
    `;

    const result = await pool.query(query, [userId]);

    const categories = result.rows.map(row => ({
      category: row.category,
      articleCount: parseInt(row.article_count),
      totalViews: parseInt(row.total_views) || 0,
      totalLikes: parseInt(row.total_likes) || 0,
      totalComments: parseInt(row.total_comments) || 0,
      avgViewsPerArticle: parseInt(row.article_count) > 0
        ? Math.round(parseInt(row.total_views) / parseInt(row.article_count))
        : 0
    }));

    res.json(categories);
  } catch (error) {
    console.error('Get top categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = exports;
