const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { authenticate } = require('../middleware/auth');

// Protected routes (require authentication) - put these first to avoid conflicts
router.post('/', authenticate, newsController.createNews);
router.get('/feed/my-feed', authenticate, newsController.getNewsFeed);
router.get('/my/articles', authenticate, newsController.getMyNews);

// Public routes - put these after protected routes
router.get('/all', newsController.getAllNews);
router.get('/user/:userId', newsController.getUserNews);
router.get('/:id', newsController.getNews);
router.put('/:id', authenticate, newsController.updateNews);
router.delete('/:id', authenticate, newsController.deleteNews);
router.post('/:id/like', authenticate, newsController.likeNews);
router.delete('/:id/like', authenticate, newsController.unlikeNews);

module.exports = router;
