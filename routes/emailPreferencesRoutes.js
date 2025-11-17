const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getEmailPreferences,
  updateEmailPreferences
} = require('../controllers/emailPreferencesController');

// Get user's email preferences
router.get('/', authenticate, getEmailPreferences);

// Update user's email preferences
router.put('/', authenticate, updateEmailPreferences);

module.exports = router;
