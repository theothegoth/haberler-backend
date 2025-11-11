const express = require('express');
const router = express.Router();
const {
  createComment,
  getComments,
  deleteComment,
  likeComment,
  unlikeComment,
  createCommentValidation
} = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');
const { cacheMiddleware, cacheKeys } = require('../middleware/cacheMiddleware');
const { createLimiter } = require('../middleware/rateLimiter');

// Get comments for a news article
router.get('/:newsId', cacheMiddleware(300, cacheKeys.comments), getComments); // Cache 5 min

// Create a comment (requires authentication)
router.post('/:newsId', authenticate, createLimiter, createCommentValidation, createComment);

// Delete a comment (requires authentication)
router.delete('/:commentId', authenticate, deleteComment);

// Like a comment (requires authentication)
router.post('/:commentId/like', authenticate, likeComment);

// Unlike a comment (requires authentication)
router.delete('/:commentId/like', authenticate, unlikeComment);

module.exports = router;
