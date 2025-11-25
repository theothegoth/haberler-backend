const Draft = require('../models/Draft');
const UserNews = require('../models/UserNews');
const { validationResult } = require('express-validator');

const draftController = {
  // Create a new draft
  async createDraft(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({ error: firstError.msg });
      }

      const { title, content, category, tags, articleType } = req.body;
      const userId = req.user?.id || req.user?.userId;

      const draft = await Draft.create({
        userId,
        title,
        content,
        category,
        tags: tags || [],
        articleType: articleType || 'news'
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json({ error: firstError.msg });
      }

      const { title, content, category, tags, articleType } = req.body;
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId;

      console.log('[DRAFT_UPDATE] Draft ID:', id, 'User ID:', userId);

      const draft = await Draft.update({
        draftId: id,
        userId,
        title,
        content,
        category,
        tags: tags || [],
        articleType
      });

      console.log('[DRAFT_UPDATE] Update successful for draft:', draft.id, 'Owner:', draft.user_id);

      res.json({
        message: 'Draft updated',
        draft
      });
    } catch (error) {
      console.error('[DRAFT_UPDATE] Error updating draft:', error);
      if (error.message === 'Draft not found or unauthorized') {
        return res.status(404).json({ error: 'Draft not found' });
      }
      res.status(500).json({ error: 'Failed to update draft' });
    }
  },

  // Get all drafts for the user
  async getAllDrafts(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const drafts = await Draft.findAllByUserId(userId);

      console.log('[GET_DRAFTS] User:', userId, 'Drafts count:', drafts.length);
      console.log('[GET_DRAFTS] First draft image_url:', drafts[0]?.image_url);

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
      const userId = req.user?.id || req.user?.userId;

      console.log('[DRAFT_GET] Draft ID:', id, 'User ID:', userId);

      const draft = await Draft.findById(id, userId);

      console.log('[DRAFT_GET] Draft found:', !!draft, draft ? `Owner: ${draft.user_id}` : 'null');

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
      const userId = req.user?.id || req.user?.userId;
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
      const userId = req.user?.id || req.user?.userId;

      // First, get the draft to validate its content
      const draft = await Draft.findById(id, userId);

      if (!draft) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      // Import validation utilities
      const { getPlainTextLength, countParagraphs } = require('../middleware/contentValidation');

      // Validate title
      if (!draft.title || draft.title.trim().length < 20) {
        return res.status(400).json({ error: 'VALIDATION.TITLE_TOO_SHORT' });
      }
      if (draft.title.trim().length > 200) {
        return res.status(400).json({ error: 'VALIDATION.TITLE_TOO_LONG' });
      }

      // Validate content
      if (!draft.content || draft.content.trim().length === 0) {
        return res.status(400).json({ error: 'VALIDATION.CONTENT_REQUIRED' });
      }

      const plainTextLength = getPlainTextLength(draft.content);
      if (plainTextLength < 500) {
        return res.status(400).json({ error: 'VALIDATION.CONTENT_TOO_SHORT' });
      }

      const paragraphCount = countParagraphs(draft.content);
      if (paragraphCount < 2) {
        return res.status(400).json({ error: 'VALIDATION.CONTENT_NEEDS_PARAGRAPHS' });
      }

      // Publish the draft
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
      res.status(500).json({ error: 'Failed to publish article' });
    }
  }
};

module.exports = draftController;
