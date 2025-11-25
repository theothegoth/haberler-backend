const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const articleImageUpload = require('../config/articleImageUpload');
const { cacheMiddleware, cacheKeys } = require('../middleware/cacheMiddleware');
const { uploadLimiter, createLimiter } = require('../middleware/rateLimiter');
const { articleValidation, checkMediaRequirement } = require('../middleware/contentValidation');

// Image upload endpoint
router.post('/upload-image', authenticate, uploadLimiter, articleImageUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Return the URL path for the uploaded image
    const imageUrl = `/uploads/article-images/${req.file.filename}`;
    res.status(200).json({
      message: 'Image uploaded successfully',
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Protected routes (require authentication) - put these first to avoid conflicts
router.post('/', authenticate, createLimiter, articleValidation, newsController.createNews);
router.get('/feed/my-feed', authenticate, cacheMiddleware(300, cacheKeys.newsFeed), newsController.getNewsFeed); // Cache 5 min
router.get('/my/articles', authenticate, cacheMiddleware(300, cacheKeys.userArticles), newsController.getMyNews); // Cache 5 min

// Public routes - put these after protected routes
router.get('/search', cacheMiddleware(600, cacheKeys.explore), newsController.searchNews); // Cache 10 min
router.get('/all', cacheMiddleware(300), newsController.getAllNews); // Cache 5 min
router.get('/user/:userId', cacheMiddleware(300, cacheKeys.userArticles), newsController.getUserNews); // Cache 5 min
router.get('/:id', optionalAuthenticate, cacheMiddleware(600, cacheKeys.articleDetail), newsController.getNews); // Cache 10 min
router.put('/:id', authenticate, articleValidation, checkMediaRequirement, newsController.updateNews);
router.delete('/:id', authenticate, newsController.deleteNews);
router.post('/:id/like', authenticate, newsController.likeNews);
router.delete('/:id/like', authenticate, newsController.unlikeNews);

module.exports = router;
