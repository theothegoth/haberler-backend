const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');

// Import admin controllers
const adminUserController = require('../controllers/admin/adminUserController');
const adminContentController = require('../controllers/admin/adminContentController');
const adminAnalyticsController = require('../controllers/admin/adminAnalyticsController');
const adminReportController = require('../controllers/admin/adminReportController');

// All routes require admin authentication
router.use(adminAuth);

// ============= ANALYTICS ROUTES =============
router.get('/analytics/dashboard', adminAnalyticsController.getDashboardStats);
router.get('/analytics/growth', adminAnalyticsController.getGrowthData);
router.get('/analytics/top-articles', adminAnalyticsController.getTopArticles);
router.get('/analytics/top-users', adminAnalyticsController.getTopUsers);
router.get('/analytics/categories', adminAnalyticsController.getCategoryStats);
router.get('/analytics/activity', adminAnalyticsController.getRecentActivity);

// ============= USER MANAGEMENT ROUTES =============
router.get('/users', adminUserController.getAllUsers);
router.get('/users/:id', adminUserController.getUserById);
router.patch('/users/:id/ban', adminUserController.toggleUserBan);
router.patch('/users/:id/role', adminUserController.updateUserRole);
router.delete('/users/:id', adminUserController.deleteUser);

// ============= CONTENT MANAGEMENT ROUTES =============
router.get('/articles', adminContentController.getAllArticles);
router.get('/articles/stats', adminContentController.getArticleStats);
router.get('/articles/:id', adminContentController.getArticleById);
router.delete('/articles/:id', adminContentController.deleteArticle);

// ============= REPORT MANAGEMENT ROUTES =============
router.get('/reports', adminReportController.getAllReports);
router.get('/reports/stats', adminReportController.getReportStats);
router.get('/reports/:id', adminReportController.getReportById);
router.patch('/reports/:id', adminReportController.updateReportStatus);

module.exports = router;
