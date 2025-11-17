const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/trending', recommendationController.getTrendingArticles);
router.get('/similar/:newsId', recommendationController.getSimilarArticles);

// Protected routes (authentication required)
router.get('/personalized', authenticate, recommendationController.getPersonalizedFeed);
router.get('/following', authenticate, recommendationController.getFollowingFeed);
router.get('/preferences', authenticate, recommendationController.getUserPreferences);

module.exports = router;
