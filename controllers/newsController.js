const UserNews = require('../models/UserNews');
const { validationResult } = require('express-validator');

const newsController = {
  // Create a new news article
  async createNews(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, category, imageUrl, tags } = req.body;
      const userId = req.user.userId;

      const news = await UserNews.create({
        userId,
        title,
        content,
        category,
        imageUrl,
        tags: tags || []
      });

      res.status(201).json(news);
    } catch (error) {
      console.error('Error creating news:', error);
      res.status(500).json({ error: 'Haber oluşturulurken bir hata oluştu' });
    }
  },

  // Get a single news article
  async getNews(req, res) {
    try {
      const { id } = req.params;
      const news = await UserNews.findById(id);

      if (!news) {
        return res.status(404).json({ error: 'Haber bulunamadı' });
      }

      res.json(news);
    } catch (error) {
      console.error('Error getting news:', error);
      res.status(500).json({ error: 'Haber getirilirken bir hata oluştu' });
    }
  },

  // Get user's own news articles
  async getMyNews(req, res) {
    try {
      const userId = req.user.userId;
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
      const userId = req.user.userId;
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
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { title, content, category, imageUrl, tags } = req.body;
      const userId = req.user.userId;

      const news = await UserNews.update(id, userId, {
        title,
        content,
        category,
        imageUrl,
        tags: tags || []
      });

      if (!news) {
        return res.status(404).json({ error: 'Haber bulunamadı veya güncelleme izniniz yok' });
      }

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
      const userId = req.user.userId;

      const news = await UserNews.delete(id, userId);

      if (!news) {
        return res.status(404).json({ error: 'Haber bulunamadı veya silme izniniz yok' });
      }

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
      const userId = req.user.userId;

      const success = await UserNews.likeNews(id, userId);

      if (!success) {
        return res.status(400).json({ error: 'Bu haberi zaten beğendiniz' });
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
      const userId = req.user.userId;

      const success = await UserNews.unlikeNews(id, userId);

      if (!success) {
        return res.status(400).json({ error: 'Bu haberi beğenmemişsiniz' });
      }

      res.json({ message: 'Beğeni kaldırıldı' });
    } catch (error) {
      console.error('Error unliking news:', error);
      res.status(500).json({ error: 'Beğeni kaldırılırken bir hata oluştu' });
    }
  }
};

module.exports = newsController;
