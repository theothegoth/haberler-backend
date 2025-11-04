const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draftController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Draft routes
router.post('/save', draftController.saveDraft);
router.get('/', draftController.getDraft);
router.delete('/', draftController.deleteDraft);
router.post('/publish', draftController.publishDraft);

module.exports = router;
