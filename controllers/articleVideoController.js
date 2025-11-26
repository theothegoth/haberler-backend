const ArticleVideo = require('../models/ArticleVideo');
const YouTubeService = require('../services/youtubeServiceNew');

const articleVideoController = {
  /**
   * Add a video to an article/draft
   * Enforces 1 video per article limit
   * Fetches and caches video metadata if not already cached
   */
  async addVideo(req, res) {
    try {
      const { articleId } = req.params;
      const { videoId } = req.body;
      const userId = req.user?.id || req.user?.userId;

      if (!videoId) {
        return res.status(400).json({ error: 'Video ID is required' });
      }

      // Check if article already has a video (1 video limit)
      const existingVideos = await ArticleVideo.getArticleVideos(articleId);
      if (existingVideos.length >= 1) {
        return res.status(400).json({
          error: 'This article already has a video. Please remove the current video first.'
        });
      }

      // Fetch and cache video metadata from YouTube if not already cached
      try {
        await YouTubeService.fetchAndCacheVideo(videoId);
      } catch (fetchError) {
        console.error('[ADD_VIDEO] Failed to fetch video metadata:', fetchError.message);
        return res.status(400).json({
          error: fetchError.message || 'Video not found or unavailable'
        });
      }

      const video = await ArticleVideo.addVideo(articleId, videoId);

      res.status(201).json({
        message: 'Video added successfully',
        video
      });
    } catch (error) {
      console.error('[ADD_VIDEO] Error:', error);

      // Handle foreign key violations
      if (error.code === '23503') {
        if (error.constraint === 'fk_article_video_video') {
          return res.status(400).json({
            error: 'Video not found. Please select a valid video.'
          });
        }
      }

      res.status(500).json({ error: 'Error adding video' });
    }
  },

  /**
   * Get all videos for an article/draft
   */
  async getArticleVideos(req, res) {
    try {
      const { articleId } = req.params;

      const videos = await ArticleVideo.getArticleVideos(articleId);

      res.json({ videos });
    } catch (error) {
      console.error('[GET_VIDEOS] Error:', error);
      res.status(500).json({ error: 'Error loading videos' });
    }
  },

  /**
   * Delete a video attachment
   */
  async deleteVideo(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.id || req.user?.userId;

      const video = await ArticleVideo.deleteVideo(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json({
        message: 'Video deleted successfully',
        video
      });
    } catch (error) {
      console.error('[DELETE_VIDEO] Error:', error);
      res.status(500).json({ error: 'Error deleting video' });
    }
  },

  /**
   * Get a single video attachment
   */
  async getVideo(req, res) {
    try {
      const { videoId } = req.params;

      const video = await ArticleVideo.getVideoById(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json({ video });
    } catch (error) {
      console.error('[GET_VIDEO] Error:', error);
      res.status(500).json({ error: 'Error loading video' });
    }
  }
};

module.exports = articleVideoController;
