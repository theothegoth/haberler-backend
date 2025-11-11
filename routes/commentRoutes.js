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

// Get comments for a news article
router.get('/:newsId', getComments);

// Create a comment (requires authentication)
router.post('/:newsId', authenticate, createCommentValidation, createComment);

// Delete a comment (requires authentication)
router.delete('/:commentId', authenticate, deleteComment);

// Like a comment (requires authentication)
router.post('/:commentId/like', authenticate, likeComment);

// Unlike a comment (requires authentication)
router.delete('/:commentId/like', authenticate, unlikeComment);

module.exports = router;
