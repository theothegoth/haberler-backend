const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const pool = require('../config/database');
const { body, validationResult } = require('express-validator');

const createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newsId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    const comment = await Comment.create(newsId, userId, content);

    // Get the article owner to notify them
    const newsResult = await pool.query(
      'SELECT user_id FROM user_news WHERE id = $1',
      [newsId]
    );

    if (newsResult.rows.length > 0) {
      const newsOwnerId = newsResult.rows[0].user_id;

      // Only notify if someone else commented (not the owner themselves)
      if (newsOwnerId !== userId) {
        Notification.createCommentNotification(newsId, userId, newsOwnerId).catch(err =>
          console.error('Error creating comment notification:', err)
        );
      }
    }

    res.status(201).json({
      message: 'Yorum başarıyla eklendi',
      comment: {
        ...comment,
        username: req.user.username
      }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Yorum eklenirken bir hata oluştu.' });
  }
};

const getComments = async (req, res) => {
  try {
    const { newsId } = req.params;
    const comments = await Comment.getByNewsId(newsId);

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Yorumlar yüklenirken bir hata oluştu.' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    const deletedComment = await Comment.delete(commentId, userId);

    if (!deletedComment) {
      return res.status(404).json({ error: 'Yorum bulunamadı veya silme yetkiniz yok.' });
    }

    res.json({ message: 'Yorum başarıyla silindi' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Yorum silinirken bir hata oluştu.' });
  }
};

const createCommentValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Yorum içeriği gereklidir')
    .isLength({ min: 1, max: 500 })
    .withMessage('Yorum 1-500 karakter arasında olmalıdır')
];

module.exports = {
  createComment,
  getComments,
  deleteComment,
  createCommentValidation
};
