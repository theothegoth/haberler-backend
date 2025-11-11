const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const articleImageUpload = require('../config/articleImageUpload');

// Image upload endpoint
router.post('/upload-image', authenticate, articleImageUpload.single('image'), (req, res) => {
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
router.post('/', authenticate, newsController.createNews);
router.get('/feed/my-feed', authenticate, newsController.getNewsFeed);
router.get('/my/articles', authenticate, newsController.getMyNews);

// Public routes - put these after protected routes
router.get('/search', newsController.searchNews);
router.get('/all', newsController.getAllNews);
router.get('/user/:userId', newsController.getUserNews);
router.get('/:id', optionalAuthenticate, newsController.getNews);
router.put('/:id', authenticate, newsController.updateNews);
router.delete('/:id', authenticate, newsController.deleteNews);
router.post('/:id/like', authenticate, newsController.likeNews);
router.delete('/:id/like', authenticate, newsController.unlikeNews);

module.exports = router;
