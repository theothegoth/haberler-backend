const express = require('express');
const router = express.Router();
const {
  createComment,
  getComments,
  deleteComment,
  createCommentValidation
} = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

// Get comments for a news article
router.get('/:newsId', getComments);

// Create a comment (requires authentication)
router.post('/:newsId', authenticate, createCommentValidation, createComment);

// Delete a comment (requires authentication)
router.delete('/:commentId', authenticate, deleteComment);

module.exports = router;
