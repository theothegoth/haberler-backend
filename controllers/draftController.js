const Draft = require('../models/Draft');
const UserNews = require('../models/UserNews');

const draftController = {
  // Create a new draft
  async createDraft(req, res) {
    try {
      const { title, content, category, imageUrl, tags } = req.body;
      const userId = req.user.userId;

      const draft = await Draft.create({
        userId,
        title,
        content,
        category,
        imageUrl,
        tags: tags || []
      });

      res.status(201).json({
        message: 'Draft created',
        draft
      });
    } catch (error) {
      console.error('Error creating draft:', error);
      if (error.message.includes('Maximum')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create draft' });
    }
  },

  // Update an existing draft
  async updateDraft(req, res) {
    try {
      const { title, content, category, imageUrl, tags } = req.body;
      const { id } = req.params;
      const userId = req.user.userId;

      const draft = await Draft.update({
        draftId: id,
        userId,
        title,
        content,
        category,
        imageUrl,
        tags: tags || []
      });

      res.json({
        message: 'Draft updated',
        draft
      });
    } catch (error) {
      console.error('Error updating draft:', error);
      if (error.message === 'Draft not found or unauthorized') {
        return res.status(404).json({ error: 'Draft not found' });
      }
      res.status(500).json({ error: 'Failed to update draft' });
    }
  },

  // Get all drafts for the user
  async getAllDrafts(req, res) {
    try {
      const userId = req.user.userId;
      const drafts = await Draft.findAllByUserId(userId);

      res.json(drafts);
    } catch (error) {
      console.error('Error getting drafts:', error);
      res.status(500).json({ error: 'Failed to get drafts' });
    }
  },

  // Get a single draft by ID
  async getDraft(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const draft = await Draft.findById(id, userId);

      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      res.json(draft);
    } catch (error) {
      console.error('Error getting draft:', error);
      res.status(500).json({ error: 'Failed to get draft' });
    }
  },

  // Delete draft
  async deleteDraft(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const draft = await Draft.delete(id, userId);

      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      res.json({ message: 'Draft deleted' });
    } catch (error) {
      console.error('Error deleting draft:', error);
      res.status(500).json({ error: 'Failed to delete draft' });
    }
  },

  // Publish draft as article
  async publishDraft(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const article = await Draft.publish(id, userId, UserNews);

      res.status(201).json({
        message: 'Article published',
        article
      });
    } catch (error) {
      console.error('Error publishing draft:', error);
      if (error.message === 'Draft not found') {
        return res.status(404).json({ error: 'Draft not found' });
      }
      res.status(500).json({ error: 'Failed to publish draft' });
    }
  }
};

module.exports = draftController;
