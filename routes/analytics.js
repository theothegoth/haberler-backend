const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

// All analytics routes require authentication
router.use(authenticate);

// Get analytics overview
router.get('/overview', analyticsController.getAnalyticsOverview);

// Get views over time
router.get('/views-over-time', analyticsController.getViewsOverTime);

// Get engagement metrics
router.get('/engagement', analyticsController.getEngagementMetrics);

// Get follower growth
router.get('/follower-growth', analyticsController.getFollowerGrowth);

// Get popular articles
router.get('/popular-articles', analyticsController.getPopularArticles);

// Get article performance details
router.get('/article/:newsId', analyticsController.getArticlePerformance);

// Get top categories
router.get('/top-categories', analyticsController.getTopCategories);

module.exports = router;
