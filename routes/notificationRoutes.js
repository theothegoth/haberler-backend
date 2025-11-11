const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { cacheMiddleware, cacheKeys } = require('../middleware/cacheMiddleware');

// All routes require authentication
router.use(authenticate);

// Get user's notifications
router.get('/', cacheMiddleware(60, cacheKeys.notifications), notificationController.getNotifications); // Cache 1 min

// Get unread count
router.get('/unread/count', cacheMiddleware(30, cacheKeys.notifications), notificationController.getUnreadCount); // Cache 30 sec

// Mark all as read
router.put('/mark-all-read', notificationController.markAllAsRead);

// Mark specific notification as read
router.put('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
