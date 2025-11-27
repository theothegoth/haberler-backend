const ArticleVideo = require('../models/ArticleVideo');
const YouTubeService = require('../services/youtubeServiceNew');
const { deleteCachePattern, deleteCache, deleteUserArticleCaches } = require('../config/cache');

const articleVideoController = {
  async addVideo(req, res) {
    try {
      const { articleId } = req.params;
      const { videoId } = req.body;
      const userId = req.user?.id || req.user?.userId;

      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      if (!videoId) return res.status(400).json({ error: 'Video ID is required' });

      // Verify article
      const pool = require('../config/database');
      let articleResult = await pool.query('SELECT id, user_id FROM drafts WHERE id = $1', [articleId]);
      if (articleResult.rows.length === 0) {
        articleResult = await pool.query('SELECT id, user_id FROM user_news WHERE id = $1', [articleId]);
      }

      if (articleResult.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
      if (articleResult.rows[0].user_id !== userId) return res.status(403).json({ error: 'Permission denied' });

      // Check limit
      const existingVideos = await ArticleVideo.getArticleVideos(articleId);
      if (existingVideos.length >= 1) return res.status(400).json({ error: 'One video limit reached' });

      // Cache video
      try {
        await YouTubeService.fetchAndCacheVideo(videoId);
      } catch (err) {
        console.error('YouTube fetch error:', err);
        return res.status(400).json({ error: err.message || 'Video unavailable' });
      }

      const video = await ArticleVideo.addVideo(articleId, videoId);

      // Clear Cache
      try {
        await Promise.allSettled([
          deleteCache(`article:${articleId}`),
          deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`),
          deleteCachePattern('news:feed:*')
        ]);
      } catch (e) { console.error('Cache error:', e); }

      res.status(201).json({ message: 'Video added', video });
    } catch (error) {
      console.error('Add video error:', error);
      res.status(500).json({ error: 'Error adding video' });
    }
  },

  async getArticleVideos(req, res) {
    try {
      const videos = await ArticleVideo.getArticleVideos(req.params.articleId);
      res.json({ videos });
    } catch (error) {
      res.status(500).json({ error: 'Error loading videos' });
    }
  },

  async deleteVideo(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.id || req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Auth required' });

      const video = await ArticleVideo.getVideoById(videoId);
      if (!video) return res.status(404).json({ error: 'Video not found' });

      const pool = require('../config/database');
      let articleResult = await pool.query('SELECT user_id FROM drafts WHERE id = $1', [video.article_id]);
      if (articleResult.rows.length === 0) {
        articleResult = await pool.query('SELECT user_id FROM user_news WHERE id = $1', [video.article_id]);
      }

      if (articleResult.rows.length === 0 || articleResult.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const deletedVideo = await ArticleVideo.deleteVideo(videoId);

      // Clear Cache
      try {
        await Promise.allSettled([
          deleteCache(`article:${video.article_id}`),
          deleteUserArticleCaches ? deleteUserArticleCaches(userId) : deleteCachePattern(`user:${userId}:articles:*`),
          deleteCachePattern('news:feed:*')
        ]);
      } catch (e) { console.error('Cache error:', e); }

      res.json({ message: 'Deleted successfully', video: deletedVideo });
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({ error: 'Error deleting video' });
    }
  },

  async getVideo(req, res) {
    try {
      const video = await ArticleVideo.getVideoById(req.params.videoId);
      if (!video) return res.status(404).json({ error: 'Not found' });
      res.json({ video });
    } catch (error) {
      res.status(500).json({ error: 'Error loading video' });
    }
  }
};

module.exports = articleVideoController;
