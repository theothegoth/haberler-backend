const pool = require('../config/database');

class Notification {
  static async create({ userId, actorId, type, entityType, entityId, message }) {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [userId, actorId, type, entityType, entityId, message]
    );
    return result.rows[0];
  }

  static async getUserNotifications(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT n.*, u.username as actor_username
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       LEFT JOIN user_news un ON (n.entity_type = 'news' AND n.entity_id = un.id)
       WHERE n.user_id = $1
       AND (
         n.entity_type != 'news' 
         OR (n.entity_type = 'news' AND un.id IS NOT NULL)
       )
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async getUnreadCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(n.id) as count 
       FROM notifications n
       LEFT JOIN user_news un ON (n.entity_type = 'news' AND n.entity_id = un.id)
       WHERE n.user_id = $1 
       AND n.is_read = FALSE
       AND (
         n.entity_type != 'news' 
         OR (n.entity_type = 'news' AND un.id IS NOT NULL)
       )`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(notificationId, userId) {
    const result = await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    return true;
  }

  static async deleteNotification(notificationId, userId) {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );
    return result.rows[0];
  }

  // Helper methods to create specific notification types
  static async createLikeNotification(newsId, likedByUserId, newsOwnerId) {
    // Don't notify if user likes their own article
    if (likedByUserId === newsOwnerId) return null;

    const result = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [likedByUserId]
    );
    const username = result.rows[0]?.username;

    return this.create({
      userId: newsOwnerId,
      actorId: likedByUserId,
      type: 'like',
      entityType: 'news',
      entityId: newsId,
      message: `${username} liked your article`
    });
  }

  static async createCommentNotification(newsId, commentedByUserId, newsOwnerId) {
    // Don't notify if user comments on their own article
    if (commentedByUserId === newsOwnerId) return null;

    const result = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [commentedByUserId]
    );
    const username = result.rows[0]?.username;

    return this.create({
      userId: newsOwnerId,
      actorId: commentedByUserId,
      type: 'comment',
      entityType: 'news',
      entityId: newsId,
      message: `${username} commented on your article`
    });
  }

  static async createFollowNotification(followedUserId, followerUserId) {
    const result = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [followerUserId]
    );
    const username = result.rows[0]?.username;

    return this.create({
      userId: followedUserId,
      actorId: followerUserId,
      type: 'follow',
      entityType: 'user',
      entityId: followerUserId,
      message: `${username} started following you`
    });
  }

  static async createNewArticleNotification(newsId, authorId, followerIds) {
    // Create notifications for all followers
    const result = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [authorId]
    );
    const username = result.rows[0]?.username;

    const promises = followerIds.map(followerId =>
      this.create({
        userId: followerId,
        actorId: authorId,
        type: 'new_article',
        entityType: 'news',
        entityId: newsId,
        message: `${username} published a new article`
      })
    );

    return Promise.all(promises);
  }
}

module.exports = Notification;
