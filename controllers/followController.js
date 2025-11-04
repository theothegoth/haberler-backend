const UserFollow = require('../models/UserFollow');
const Notification = require('../models/Notification');

const followController = {
  // Follow a user
  async followUser(req, res) {
    try {
      const { userId } = req.params;
      const followerId = req.user.userId;

      const follow = await UserFollow.follow(followerId, parseInt(userId));

      // Create notification for the followed user
      Notification.createFollowNotification(parseInt(userId), followerId).catch(err =>
        console.error('Error creating follow notification:', err)
      );

      res.status(201).json({ message: 'Kullanıcı takip edildi', follow });
    } catch (error) {
      if (error.message === 'Cannot follow yourself') {
        return res.status(400).json({ error: 'Kendinizi takip edemezsiniz' });
      }
      if (error.message === 'Already following this user') {
        return res.status(400).json({ error: 'Bu kullanıcıyı zaten takip ediyorsunuz' });
      }
      console.error('Error following user:', error);
      res.status(500).json({ error: 'Takip edilirken bir hata oluştu' });
    }
  },

  // Unfollow a user
  async unfollowUser(req, res) {
    try {
      const { userId } = req.params;
      const followerId = req.user.userId;

      const result = await UserFollow.unfollow(followerId, parseInt(userId));

      if (!result) {
        return res.status(400).json({ error: 'Bu kullanıcıyı takip etmiyorsunuz' });
      }

      res.json({ message: 'Takipten çıkıldı' });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({ error: 'Takipten çıkılırken bir hata oluştu' });
    }
  },

  // Check if following a user
  async checkFollowing(req, res) {
    try {
      const { userId } = req.params;
      const followerId = req.user.userId;

      const isFollowing = await UserFollow.isFollowing(followerId, parseInt(userId));
      res.json({ isFollowing });
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ error: 'Takip durumu kontrol edilirken bir hata oluştu' });
    }
  },

  // Get user's followers
  async getFollowers(req, res) {
    try {
      const { userId } = req.params;
      const followers = await UserFollow.getFollowers(parseInt(userId));
      res.json(followers);
    } catch (error) {
      console.error('Error getting followers:', error);
      res.status(500).json({ error: 'Takipçiler getirilirken bir hata oluştu' });
    }
  },

  // Get users that the user is following
  async getFollowing(req, res) {
    try {
      const { userId } = req.params;
      const following = await UserFollow.getFollowing(parseInt(userId));
      res.json(following);
    } catch (error) {
      console.error('Error getting following:', error);
      res.status(500).json({ error: 'Takip edilenler getirilirken bir hata oluştu' });
    }
  },

  // Get my followers
  async getMyFollowers(req, res) {
    try {
      const userId = req.user.userId;
      const followers = await UserFollow.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error('Error getting my followers:', error);
      res.status(500).json({ error: 'Takipçiler getirilirken bir hata oluştu' });
    }
  },

  // Get users I'm following
  async getMyFollowing(req, res) {
    try {
      const userId = req.user.userId;
      const following = await UserFollow.getFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error('Error getting my following:', error);
      res.status(500).json({ error: 'Takip edilenler getirilirken bir hata oluştu' });
    }
  },

  // Get follow counts
  async getFollowCounts(req, res) {
    try {
      const { userId } = req.params;
      const counts = await UserFollow.getFollowCounts(parseInt(userId));
      res.json(counts);
    } catch (error) {
      console.error('Error getting follow counts:', error);
      res.status(500).json({ error: 'Takip sayıları getirilirken bir hata oluştu' });
    }
  },

  // Get suggested users to follow
  async getSuggestedUsers(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10 } = req.query;
      const suggestions = await UserFollow.getSuggestedUsers(userId, parseInt(limit));
      res.json(suggestions);
    } catch (error) {
      console.error('Error getting suggested users:', error);
      res.status(500).json({ error: 'Önerilen kullanıcılar getirilirken bir hata oluştu' });
    }
  }
};

module.exports = followController;
