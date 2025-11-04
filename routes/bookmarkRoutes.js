const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');
const { authenticate } = require('../middleware/auth');

// All bookmark routes require authentication
router.post('/:newsId', authenticate, bookmarkController.saveArticle);
router.delete('/:newsId', authenticate, bookmarkController.unsaveArticle);
router.get('/check/:newsId', authenticate, bookmarkController.checkSaved);
router.get('/', authenticate, bookmarkController.getSavedArticles);

module.exports = router;
