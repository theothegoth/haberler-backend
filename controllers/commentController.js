const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const pool = require('../config/database');
const { body, validationResult } = require('express-validator');
const { deleteCache } = require('../config/cache');
const { sendNewCommentEmail } = require('../services/emailService');
const { checkPreference } = require('./emailPreferencesController');

const createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { newsId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user?.id || req.user?.userId;

    const comment = await Comment.create(newsId, userId, content, parentId);

    // Get the article owner to notify them
    const newsResult = await pool.query(
      'SELECT user_id, title FROM user_news WHERE id = $1',
      [newsId]
    );

    if (newsResult.rows.length > 0) {
      const newsOwnerId = newsResult.rows[0].user_id;
      const articleTitle = newsResult.rows[0].title;

      // Only notify if someone else commented (not the owner themselves)
      if (newsOwnerId !== userId) {
        Notification.createCommentNotification(newsId, userId, newsOwnerId).catch(err =>
          console.error('Error creating comment notification:', err)
        );

        // Send email notification if user has it enabled
        (async () => {
          try {
            const hasEmailEnabled = await checkPreference(newsOwnerId, 'new_comment');
            if (hasEmailEnabled) {
              const ownerResult = await pool.query(
                'SELECT email, username FROM users WHERE id = $1',
                [newsOwnerId]
              );
              const commenterResult = await pool.query(
                'SELECT username FROM users WHERE id = $1',
                [userId]
              );

              if (ownerResult.rows[0] && commenterResult.rows[0]) {
                await sendNewCommentEmail(
                  ownerResult.rows[0].email,
                  ownerResult.rows[0].username,
                  commenterResult.rows[0].username,
                  newsId,
                  articleTitle,
                  content
                );
              }
            }
          } catch (emailError) {
            console.error('Error sending comment email:', emailError);
          }
        })();
      }
    }

    // If this is a reply, notify the parent comment owner
    if (parentId) {
      const parentResult = await pool.query(
        'SELECT user_id FROM comments WHERE id = $1',
        [parentId]
      );

      if (parentResult.rows.length > 0) {
        const parentCommentOwnerId = parentResult.rows[0].user_id;

        // Only notify if someone else replied (not replying to their own comment)
        if (parentCommentOwnerId !== userId) {
          // Note: You might want to create a new notification type for replies
          // For now, using comment notification
          Notification.createCommentNotification(newsId, userId, parentCommentOwnerId).catch(err =>
            console.error('Error creating reply notification:', err)
          );
        }
      }
    }

    // Invalidate comments cache for this article
    deleteCache(`comments:article:${newsId}`).catch(err => console.error('Cache invalidation error:', err));

    res.status(201).json({
      message: 'Yorum başarıyla eklendi',
      comment: {
        ...comment,
        username: req.user.username
      }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    
    // Handle specific validation errors from the model
    if (error.message === 'Parent comment not found') {
      return res.status(404).json({ error: 'Yanıtlanacak yorum bulunamadı' });
    }
    if (error.message === 'Cannot reply to a reply - only 1 level of nesting allowed') {
      return res.status(400).json({ error: 'Bir yanıta yanıt verilemez - sadece 1 seviye iç içe geçmeye izin verilir' });
    }
    
    res.status(500).json({ error: 'Yorum eklenirken bir hata oluştu.' });
  }
};

const getComments = async (req, res) => {
  try {
    const { newsId } = req.params;
    const userId = req.user ? (req.user.id || req.user.userId) : null; // Get userId if authenticated, null otherwise

    const comments = await Comment.getByNewsId(newsId, userId);

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Yorumlar yüklenirken bir hata oluştu.' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const deletedComment = await Comment.delete(commentId, userId);

    if (!deletedComment) {
      return res.status(404).json({ error: 'Yorum bulunamadı veya silme yetkiniz yok.' });
    }

    // Invalidate comments cache for the article
    if (deletedComment.news_id) {
      deleteCache(`comments:article:${deletedComment.news_id}`).catch(err =>
        console.error('Cache invalidation error:', err)
      );
    }

    res.json({ message: 'Yorum başarıyla silindi' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Yorum silinirken bir hata oluştu.' });
  }
};

const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const success = await Comment.like(commentId, userId);

    if (!success) {
      return res.status(400).json({ error: 'Bu yorumu zaten beğendiniz' });
    }

    res.json({ message: 'Yorum beğenildi' });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ error: 'Yorum beğenilirken bir hata oluştu.' });
  }
};

const unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const success = await Comment.unlike(commentId, userId);

    if (!success) {
      return res.status(400).json({ error: 'Bu yorumu beğenmediniz' });
    }

    res.json({ message: 'Beğeni kaldırıldı' });
  } catch (error) {
    console.error('Unlike comment error:', error);
    res.status(500).json({ error: 'Beğeni kaldırılırken bir hata oluştu.' });
  }
};

const createCommentValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Yorum içeriği gereklidir')
    .isLength({ min: 1, max: 500 })
    .withMessage('Yorum 1-500 karakter arasında olmalıdır'),
  body('parentId')
    .optional({ nullable: true, checkFalsy: false })
    .isInt()
    .withMessage('Parent ID geçerli bir sayı olmalıdır')
];

module.exports = {
  createComment,
  getComments,
  deleteComment,
  likeComment,
  unlikeComment,
  createCommentValidation
};
