const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const { authenticate } = require('../middleware/auth');
const { createLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Draft routes
router.post('/', createLimiter, draftController.createDraft);
router.get('/', draftController.getAllDrafts);
router.get('/:id', draftController.getDraft);
router.put('/:id', createLimiter, draftController.updateDraft);
router.delete('/:id', draftController.deleteDraft);
router.post('/:id/publish', createLimiter, draftController.publishDraft);

module.exports = router;
