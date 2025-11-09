const express = require('express');
const router = express.Router();
const {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkIfBlocked
} = require('../controllers/blockController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication

// Get list of blocked users
router.get('/', authenticate, getBlockedUsers);

// Check if a user is blocked
router.get('/check/:userId', authenticate, checkIfBlocked);

// Block a user
router.post('/:userId', authenticate, blockUser);

// Unblock a user
router.delete('/:userId', authenticate, unblockUser);

module.exports = router;
