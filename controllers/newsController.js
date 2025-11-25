const UserNews = require('../models/UserNews');
const Notification = require('../models/Notification');
const ArticleView = require('../models/ArticleView');
const pool = require('../config/database');
const { validationResult } = require('express-validator');
const { deleteCachePattern, deleteCache } = require('../config/cache');
const { sendNewLikeEmail } = require('../services/emailService');
const { checkPreference } = require('./emailPreferencesController');

const newsController = {
  // Create a new news article
  async createNews(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({ error: firstError.msg });
      }

      const { title, content, category, tags } = req.body;
      const userId = req.user?.id || req.user?.userId;

      const news = await UserNews.create({
        userId,
        title,
        content,
        category,
        tags: tags || []
      });

      // Get follower IDs to notify them
      const followersResult = await pool.query(
        'SELECT follower_id FROM user_follows WHERE followed_id = $1',
        [userId]
      );
      const followerIds = followersResult.rows.map(row => row.follower_id);

      // Create notifications for all followers (don't await, let it run in background)
      if (followerIds.length > 0) {
        Notification.createNewArticleNotification(news.id, userId, followerIds).catch(err =>
          console.error('Error creating new article notifications:', err)
        );
      }

      // Invalidate relevant caches
      deleteCachePattern('news:feed:*').catch(err => console.error('Cache invalidation error:', err));
      deleteCachePattern(`user:${userId}:articles:*`).catch(err => console.error('Cache invalidation error:', err));

      res.status(201).json(news);
    } catch (error) {
      console.error('Error creating news:', error);
      res.status(500).json({ error: 'Haber oluşturulurken bir hata oluştu' });
    }
  },

  // Get a single news article
  async getNews(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const { id } = req.params;
      const news = await UserNews.findById(id, userId);

      if (!news) {
        return res.status(404).json({ error: 'Haber bulunamadı' });
      }

      console.log('[DEBUG] getNews - Article ID:', id, 'User ID:', userId, 'user_has_liked:', news.user_has_liked);
      
      // Track article view (don't wait for it)
      const ipAddress = req.ip || req.connection.remoteAddress;
      ArticleView.recordView(id, userId, ipAddress).catch(err => 
        console.error('Error recording view:', err)
      );
      res.json(news);
    } catch (error) {
      console.error('Error getting news:', error);
      res.status(500).json({ error: 'Haber getirilirken bir hata oluştu' });
    }
  },

  // Get user's own news articles
  async getMyNews(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { limit = 20, offset = 0 } = req.query;

      const news = await UserNews.findByUserId(userId, parseInt(limit), parseInt(offset));
      res.json(news);
    } catch (error) {
      console.error('Error getting my news:', error);
      res.status(500).json({ error: 'Haberler getirilirken bir hata oluştu' });
    }
  },

  // Get news by a specific user
  async getUserNews(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const news = await UserNews.findByUserId(userId, parseInt(limit), parseInt(offset));
      res.json(news);
    } catch (error) {
      console.error('Error getting user news:', error);
      res.status(500).json({ error: 'Haberler getirilirken bir hata oluştu' });
    }
  },

  // Get news feed (from followed users)
  async getNewsFeed(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { limit = 20, offset = 0 } = req.query;

      const news = await UserNews.getNewsFeed(userId, parseInt(limit), parseInt(offset));
      res.json(news);
    } catch (error) {
      console.error('Error getting news feed:', error);
      res.status(500).json({ error: 'Haber akışı getirilirken bir hata oluştu' });
    }
  },

  // Get all public news
  async getAllNews(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const news = await UserNews.getAllPublic(parseInt(limit), parseInt(offset));
      res.json(news);
    } catch (error) {
      console.error('Error getting all news:', error);
      res.status(500).json({ error: 'Haberler getirilirken bir hata oluştu' });
    }
  },

  // Update news article
  async updateNews(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({ error: firstError.msg });
      }

      const { id } = req.params;
      const { title, content, category, tags } = req.body;
      const userId = req.user?.id || req.user?.userId;

      const news = await UserNews.update(id, userId, {
        title,
        content,
        category,
        tags: tags || []
      });

      if (!news) {
        return res.status(404).json({ error: 'Haber bulunamadı veya güncelleme izniniz yok' });
      }

      // Invalidate relevant caches
      deleteCache(`article:${id}`).catch(err => console.error('Cache invalidation error:', err));
      deleteCachePattern('news:feed:*').catch(err => console.error('Cache invalidation error:', err));
      deleteCachePattern(`user:${userId}:articles:*`).catch(err => console.error('Cache invalidation error:', err));

      res.json(news);
    } catch (error) {
      console.error('Error updating news:', error);
      res.status(500).json({ error: 'Haber güncellenirken bir hata oluştu' });
    }
  },

  // Delete news article
  async deleteNews(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId;

      const news = await UserNews.delete(id, userId);

      if (!news) {
        return res.status(404).json({ error: 'Haber bulunamadı veya silme izniniz yok' });
      }

      // Invalidate relevant caches
      deleteCache(`article:${id}`).catch(err => console.error('Cache invalidation error:', err));
      deleteCachePattern('news:feed:*').catch(err => console.error('Cache invalidation error:', err));
      deleteCachePattern(`user:${userId}:articles:*`).catch(err => console.error('Cache invalidation error:', err));
      deleteCachePattern(`comments:article:${id}`).catch(err => console.error('Cache invalidation error:', err));

      res.json({ message: 'Haber başarıyla silindi', news });
    } catch (error) {
      console.error('Error deleting news:', error);
      res.status(500).json({ error: 'Haber silinirken bir hata oluştu' });
    }
  },

  // Like a news article
  async likeNews(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId;

      // Get the news article to find the owner
      const news = await UserNews.findById(id, userId);
      if (!news) {
        return res.status(404).json({ error: 'Haber bulunamadı' });
      }

      const success = await UserNews.likeNews(id, userId);

      if (!success) {
        return res.status(400).json({ error: 'Bu haberi zaten beğendiniz' });
      }

      // Only notify and send email if the liker is not the article owner
      if (news.user_id !== userId) {
        // Create notification for the article owner (don't await)
        Notification.createLikeNotification(id, userId, news.user_id).catch(err =>
          console.error('Error creating like notification:', err)
        );

        // Send email notification if user has it enabled
        (async () => {
          try {
            const hasEmailEnabled = await checkPreference(news.user_id, 'new_like');
            if (hasEmailEnabled) {
              const ownerResult = await pool.query(
                'SELECT email, username FROM users WHERE id = $1',
                [news.user_id]
              );
              const likerResult = await pool.query(
                'SELECT username FROM users WHERE id = $1',
                [userId]
              );

              if (ownerResult.rows[0] && likerResult.rows[0]) {
                await sendNewLikeEmail(
                  ownerResult.rows[0].email,
                  ownerResult.rows[0].username,
                  likerResult.rows[0].username,
                  id,
                  news.title
                );
              }
            }
          } catch (emailError) {
            console.error('Error sending like email:', emailError);
          }
        })();
      }

      res.json({ message: 'Haber beğenildi' });
    } catch (error) {
      console.error('Error liking news:', error);
      res.status(500).json({ error: 'Haber beğenilirken bir hata oluştu' });
    }
  },

  // Unlike a news article
  async unlikeNews(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId;

      const success = await UserNews.unlikeNews(id, userId);

      if (!success) {
        return res.status(400).json({ error: 'Bu haberi beğenmemişsiniz' });
      }

      res.json({ message: 'Beğeni kaldırıldı' });
    } catch (error) {
      console.error('Error unliking news:', error);
      res.status(500).json({ error: 'Beğeni kaldırılırken bir hata oluştu' });
    }
  },

  // Advanced search with filters
  async searchNews(req, res) {
    try {
      const {
        q,              // search query
        category,       // single or multiple categories (comma-separated)
        author,         // author username
        tags,           // tags (comma-separated)
        startDate,      // date range start
        endDate,        // date range end
        sortBy = 'date', // date, relevance, popularity
        limit = 20,
        offset = 0
      } = req.query;

      const news = await UserNews.advancedSearch({
        query: q,
        categories: category ? category.split(',') : null,
        author,
        tags: tags ? tags.split(',') : null,
        startDate,
        endDate,
        sortBy,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json(news);
    } catch (error) {
      console.error('Error searching news:', error);
      res.status(500).json({ error: 'Arama yapılırken bir hata oluştu' });
    }
  }
};

module.exports = newsController;
