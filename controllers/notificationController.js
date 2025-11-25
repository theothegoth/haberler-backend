const Notification = require('../models/Notification');

const notificationController = {
  // Get user's notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { limit = 20, offset = 0 } = req.query;

      const notifications = await Notification.getUserNotifications(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      // For compatibility with frontend, return in expected format
      res.json({
        notifications,
        hasMore: notifications.length === parseInt(limit)
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Bildirimler getirilirken bir hata oluştu' });
    }
  },

  // Get unread notification count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const count = await Notification.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Okunmamış bildirim sayısı getirilirken bir hata oluştu' });
    }
  },

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId;

      const notification = await Notification.markAsRead(id, userId);

      if (!notification) {
        return res.status(404).json({ error: 'Bildirim bulunamadı' });
      }

      res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Bildirim okundu olarak işaretlenirken bir hata oluştu' });
    }
  },

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      await Notification.markAllAsRead(userId);
      res.json({ message: 'Tüm bildirimler okundu olarak işaretlendi' });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({ error: 'Bildirimler okundu olarak işaretlenirken bir hata oluştu' });
    }
  },

  // Delete a notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId;

      const notification = await Notification.deleteNotification(id, userId);

      if (!notification) {
        return res.status(404).json({ error: 'Bildirim bulunamadı' });
      }

      res.json({ message: 'Bildirim silindi', notification });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Bildirim silinirken bir hata oluştu' });
    }
  }
};

module.exports = notificationController;
