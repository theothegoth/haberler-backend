const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const { authenticate } = require('../middleware/auth');
const { createLimiter } = require('../middleware/rateLimiter');
const { draftValidation, articleValidation, checkMediaRequirement } = require('../middleware/contentValidation');

// All routes require authentication
router.use(authenticate);

// Draft routes
router.post('/', createLimiter, draftValidation, draftController.createDraft);
router.get('/', draftController.getAllDrafts);
router.get('/:id', draftController.getDraft);
router.put('/:id', createLimiter, draftValidation, draftController.updateDraft);
router.delete('/:id', draftController.deleteDraft);
router.post('/:id/publish', createLimiter, checkMediaRequirement, draftController.publishDraft);

module.exports = router;
