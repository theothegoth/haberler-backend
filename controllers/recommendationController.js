const pool = require('../config/database');

// Get similar articles based on category and engagement (You might also like)
exports.getSimilarArticles = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { limit = 5 } = req.query;

    // Get the current article's category
    const currentArticle = await pool.query(
      'SELECT category, user_id FROM user_news WHERE id = $1',
      [newsId]
    );

    if (currentArticle.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const { category, user_id } = currentArticle.rows[0];

    // Get similar articles from the same category, excluding current article and same author
    const query = `
      SELECT
        un.id,
        un.title,
        un.content,
        un.category,
        un.view_count,
        un.created_at,
        u.username as author_username,
        u.profile_picture as author_profile_picture,
        (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1) as image_url,
        COALESCE(
          (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1),
          (SELECT vc.thumbnail FROM article_videos av JOIN videos_cache vc ON av.video_id = vc.video_id WHERE av.article_id = un.id ORDER BY av.created_at ASC LIMIT 1)
        ) as display_thumbnail,
        COUNT(DISTINCT nl.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        (un.view_count + COUNT(DISTINCT nl.id) * 2 + COUNT(DISTINCT c.id) * 3) as engagement_score
      FROM user_news un
      JOIN users u ON un.user_id = u.id
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      WHERE un.category = $1
        AND un.id != $2
        AND un.user_id != $3
        AND un.created_at >= NOW() - INTERVAL '90 days'
      GROUP BY un.id, un.title, un.content, un.category, un.view_count, un.created_at, u.username, u.profile_picture
      ORDER BY engagement_score DESC, un.created_at DESC
      LIMIT $4
    `;

    const result = await pool.query(query, [category, newsId, user_id, parseInt(limit)]);

    const articles = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content.substring(0, 200) + '...',
      category: row.category,
      imageUrl: row.image_url,
      displayThumbnail: row.display_thumbnail,
      views: parseInt(row.view_count) || 0,
      likes: parseInt(row.likes_count) || 0,
      comments: parseInt(row.comments_count) || 0,
      author: {
        username: row.author_username,
        profilePicture: row.author_profile_picture
      },
      createdAt: row.created_at
    }));

    res.json(articles);
  } catch (error) {
    console.error('Get similar articles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get trending articles based on recent engagement
exports.getTrendingArticles = async (req, res) => {
  try {
    const { limit = 10, days = 7 } = req.query;
    const daysInt = parseInt(days);

    // Trending algorithm: weighted score based on recent views, likes, and comments
    // More recent activity gets higher weight
    const query = `
      SELECT
        un.id,
        un.title,
        un.content,
        un.category,
        un.view_count,
        un.created_at,
        u.username as author_username,
        u.profile_picture as author_profile_picture,
        (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1) as image_url,
        COALESCE(
          (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1),
          (SELECT vc.thumbnail FROM article_videos av2 JOIN videos_cache vc ON av2.video_id = vc.video_id WHERE av2.article_id = un.id ORDER BY av2.created_at ASC LIMIT 1)
        ) as display_thumbnail,
        COUNT(DISTINCT CASE WHEN av.viewed_at >= NOW() - $2 * INTERVAL '1 day' THEN av.id END) as recent_views,
        COUNT(DISTINCT CASE WHEN nl.created_at >= NOW() - $2 * INTERVAL '1 day' THEN nl.id END) as recent_likes,
        COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - $2 * INTERVAL '1 day' THEN c.id END) as recent_comments,
        (
          COUNT(DISTINCT CASE WHEN av.viewed_at >= NOW() - $2 * INTERVAL '1 day' THEN av.id END) * 1 +
          COUNT(DISTINCT CASE WHEN nl.created_at >= NOW() - $2 * INTERVAL '1 day' THEN nl.id END) * 3 +
          COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - $2 * INTERVAL '1 day' THEN c.id END) * 5
        ) as trending_score
      FROM user_news un
      JOIN users u ON un.user_id = u.id
      LEFT JOIN article_views av ON un.id = av.news_id
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      WHERE un.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY un.id, un.title, un.content, un.category, un.view_count, un.created_at, u.username, u.profile_picture
      HAVING (
        COUNT(DISTINCT CASE WHEN av.viewed_at >= NOW() - $2 * INTERVAL '1 day' THEN av.id END) * 1 +
        COUNT(DISTINCT CASE WHEN nl.created_at >= NOW() - $2 * INTERVAL '1 day' THEN nl.id END) * 3 +
        COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - $2 * INTERVAL '1 day' THEN c.id END) * 5
      ) > 0
      ORDER BY trending_score DESC, un.created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit), daysInt]);

    const articles = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content.substring(0, 200) + '...',
      category: row.category,
      imageUrl: row.image_url,
      displayThumbnail: row.display_thumbnail,
      views: parseInt(row.view_count) || 0,
      recentViews: parseInt(row.recent_views) || 0,
      recentLikes: parseInt(row.recent_likes) || 0,
      recentComments: parseInt(row.recent_comments) || 0,
      trendingScore: parseInt(row.trending_score) || 0,
      author: {
        username: row.author_username,
        profilePicture: row.author_profile_picture
      },
      createdAt: row.created_at
    }));

    res.json(articles);
  } catch (error) {
    console.error('Get trending articles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get personalized recommendations based on user's reading history
exports.getPersonalizedFeed = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { limit = 20, offset = 0 } = req.query;

    // Get user's reading history to determine preferences
    const historyQuery = `
      SELECT un.category, COUNT(*) as read_count
      FROM article_views av
      JOIN user_news un ON av.news_id = un.id
      WHERE av.user_id = $1
      GROUP BY un.category
      ORDER BY read_count DESC
      LIMIT 5
    `;

    const historyResult = await pool.query(historyQuery, [userId]);
    const preferredCategories = historyResult.rows.map(row => row.category);

    // If user has no reading history, return trending articles
    if (preferredCategories.length === 0) {
      return exports.getTrendingArticles(req, res);
    }

    // Get articles from preferred categories that user hasn't read yet
    const query = `
      SELECT
        un.id,
        un.title,
        un.content,
        un.category,
        un.view_count,
        un.created_at,
        u.username as author_username,
        u.profile_picture as author_profile_picture,
        (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1) as image_url,
        COALESCE(
          (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1),
          (SELECT vc.thumbnail FROM article_videos av JOIN videos_cache vc ON av.video_id = vc.video_id WHERE av.article_id = un.id ORDER BY av.created_at ASC LIMIT 1)
        ) as display_thumbnail,
        COUNT(DISTINCT nl.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        CASE
          WHEN un.category = $2 THEN 3
          WHEN un.category = ANY($3::text[]) THEN 2
          ELSE 1
        END as category_relevance,
        (un.view_count + COUNT(DISTINCT nl.id) * 2 + COUNT(DISTINCT c.id) * 3) as engagement_score
      FROM user_news un
      JOIN users u ON un.user_id = u.id
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      WHERE un.id NOT IN (
        SELECT news_id FROM article_views WHERE user_id = $1
      )
      AND un.user_id != $1
      AND un.created_at >= NOW() - INTERVAL '60 days'
      GROUP BY un.id, un.title, un.content, un.category, un.view_count, un.created_at, u.username, u.profile_picture
      ORDER BY category_relevance DESC, engagement_score DESC, un.created_at DESC
      LIMIT $4 OFFSET $5
    `;

    const result = await pool.query(query, [
      userId,
      preferredCategories[0] || '',
      preferredCategories,
      parseInt(limit),
      parseInt(offset)
    ]);

    const articles = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content.substring(0, 200) + '...',
      category: row.category,
      imageUrl: row.image_url,
      displayThumbnail: row.display_thumbnail,
      views: parseInt(row.view_count) || 0,
      likes: parseInt(row.likes_count) || 0,
      comments: parseInt(row.comments_count) || 0,
      author: {
        username: row.author_username,
        profilePicture: row.author_profile_picture
      },
      createdAt: row.created_at,
      recommended: true
    }));

    res.json(articles);
  } catch (error) {
    console.error('Get personalized feed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get articles from authors the user follows
exports.getFollowingFeed = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { limit = 20, offset = 0 } = req.query;

    const query = `
      SELECT
        un.id,
        un.title,
        un.content,
        un.category,
        un.view_count,
        un.created_at,
        u.username as author_username,
        u.profile_picture as author_profile_picture,
        (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1) as image_url,
        COALESCE(
          (SELECT image_url FROM article_images WHERE article_id = un.id ORDER BY display_order ASC LIMIT 1),
          (SELECT vc.thumbnail FROM article_videos av JOIN videos_cache vc ON av.video_id = vc.video_id WHERE av.article_id = un.id ORDER BY av.created_at ASC LIMIT 1)
        ) as display_thumbnail,
        COUNT(DISTINCT nl.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count
      FROM user_news un
      JOIN users u ON un.user_id = u.id
      JOIN user_follows uf ON un.user_id = uf.followed_id
      LEFT JOIN news_likes nl ON un.id = nl.news_id
      LEFT JOIN comments c ON un.id = c.news_id
      WHERE uf.follower_id = $1
      GROUP BY un.id, un.title, un.content, un.category, un.view_count, un.created_at, u.username, u.profile_picture
      ORDER BY un.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, parseInt(limit), parseInt(offset)]);

    const articles = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content.substring(0, 200) + '...',
      category: row.category,
      imageUrl: row.image_url,
      displayThumbnail: row.display_thumbnail,
      views: parseInt(row.view_count) || 0,
      likes: parseInt(row.likes_count) || 0,
      comments: parseInt(row.comments_count) || 0,
      author: {
        username: row.author_username,
        profilePicture: row.author_profile_picture
      },
      createdAt: row.created_at
    }));

    res.json(articles);
  } catch (error) {
    console.error('Get following feed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user's reading preferences
exports.getUserPreferences = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    // Get category preferences
    const categoryQuery = `
      SELECT
        un.category,
        COUNT(*) as read_count,
        COUNT(DISTINCT CASE WHEN nl.user_id = $1 THEN nl.id END) as liked_count
      FROM article_views av
      JOIN user_news un ON av.news_id = un.id
      LEFT JOIN news_likes nl ON un.id = nl.news_id AND nl.user_id = $1
      WHERE av.user_id = $1
      GROUP BY un.category
      ORDER BY read_count DESC
    `;

    const categoryResult = await pool.query(categoryQuery, [userId]);

    // Get most read authors
    const authorsQuery = `
      SELECT
        u.id,
        u.username,
        u.profile_picture,
        COUNT(*) as read_count
      FROM article_views av
      JOIN user_news un ON av.news_id = un.id
      JOIN users u ON un.user_id = u.id
      WHERE av.user_id = $1
      GROUP BY u.id, u.username, u.profile_picture
      ORDER BY read_count DESC
      LIMIT 10
    `;

    const authorsResult = await pool.query(authorsQuery, [userId]);

    res.json({
      categories: categoryResult.rows.map(row => ({
        category: row.category,
        readCount: parseInt(row.read_count),
        likedCount: parseInt(row.liked_count)
      })),
      favoriteAuthors: authorsResult.rows.map(row => ({
        id: row.id,
        username: row.username,
        profilePicture: row.profile_picture,
        readCount: parseInt(row.read_count)
      }))
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = exports;
