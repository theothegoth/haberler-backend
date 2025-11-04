const Draft = require('../models/Draft');
const UserNews = require('../models/UserNews');

const draftController = {
  // Save/update draft (auto-save)
  async saveDraft(req, res) {
    try {
      const { title, content, category, imageUrl, tags } = req.body;
      const userId = req.user.userId;

      const draft = await Draft.upsert({
        userId,
        title,
        content,
        category,
        imageUrl,
        tags: tags || []
      });

      res.json({
        message: 'Draft saved',
        draft
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      res.status(500).json({ error: 'Taslak kaydedilirken bir hata oluştu' });
    }
  },

  // Get user's draft
  async getDraft(req, res) {
    try {
      const userId = req.user.userId;
      const draft = await Draft.findByUserId(userId);

      if (!draft) {
        return res.status(404).json({ error: 'Taslak bulunamadı' });
      }

      res.json(draft);
    } catch (error) {
      console.error('Error getting draft:', error);
      res.status(500).json({ error: 'Taslak getirilirken bir hata oluştu' });
    }
  },

  // Delete draft
  async deleteDraft(req, res) {
    try {
      const userId = req.user.userId;
      const draft = await Draft.delete(userId);

      if (!draft) {
        return res.status(404).json({ error: 'Taslak bulunamadı' });
      }

      res.json({ message: 'Taslak silindi' });
    } catch (error) {
      console.error('Error deleting draft:', error);
      res.status(500).json({ error: 'Taslak silinirken bir hata oluştu' });
    }
  },

  // Publish draft as article
  async publishDraft(req, res) {
    try {
      const userId = req.user.userId;
      const article = await Draft.publish(userId, UserNews);

      res.status(201).json({
        message: 'Haber yayınlandı',
        article
      });
    } catch (error) {
      console.error('Error publishing draft:', error);
      if (error.message === 'Draft not found') {
        return res.status(404).json({ error: 'Taslak bulunamadı' });
      }
      res.status(500).json({ error: 'Haber yayınlanırken bir hata oluştu' });
    }
  }
};

module.exports = draftController;
