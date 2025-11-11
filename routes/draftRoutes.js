const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const { authenticate } = require('../middleware/auth');
const { createLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticate);

// Draft routes
router.post('/save', createLimiter, draftController.saveDraft);
router.get('/', draftController.getDraft);
router.delete('/', draftController.deleteDraft);
router.post('/publish', createLimiter, draftController.publishDraft);

module.exports = router;
