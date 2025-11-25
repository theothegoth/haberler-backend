const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const articleVideoController = require('../controllers/articleVideoController');

// Add video to article/draft
router.post('/:articleId/videos', authenticate, articleVideoController.addVideo);

// Get all videos for an article/draft
router.get('/:articleId/videos', articleVideoController.getArticleVideos);

// Delete a video attachment
router.delete('/videos/:videoId', authenticate, articleVideoController.deleteVideo);

// Get a single video attachment
router.get('/videos/:videoId', articleVideoController.getVideo);

module.exports = router;
