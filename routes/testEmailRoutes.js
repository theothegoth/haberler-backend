const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { runManualDigest } = require('../jobs/weeklyDigest');
const { sendNewFollowerEmail, sendNewCommentEmail, sendNewLikeEmail } = require('../services/emailService');
const pool = require('../config/database');

// Manual trigger for weekly digest (admin only in production)
router.post('/trigger-digest', authenticate, async (req, res) => {
  try {
    // In production, you might want to check if user is admin
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }

    await runManualDigest();
    res.json({ message: 'Weekly digest job triggered successfully' });
  } catch (error) {
    console.error('Error triggering digest:', error);
    res.status(500).json({ error: 'Failed to trigger digest' });
  }
});

// Test follower notification email
router.post('/test-follower-email', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await pool.query('SELECT email, username FROM users WHERE id = $1', [userId]);

    if (!user.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await sendNewFollowerEmail(
      user.rows[0].email,
      user.rows[0].username,
      'Test Follower',
      999
    );

    res.json({ message: 'Test follower email sent', result });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Test comment notification email
router.post('/test-comment-email', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await pool.query('SELECT email, username FROM users WHERE id = $1', [userId]);

    if (!user.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await sendNewCommentEmail(
      user.rows[0].email,
      user.rows[0].username,
      'Test Commenter',
      999,
      'Test Article Title',
      'This is a test comment on your article. It looks great!'
    );

    res.json({ message: 'Test comment email sent', result });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Test like notification email
router.post('/test-like-email', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await pool.query('SELECT email, username FROM users WHERE id = $1', [userId]);

    if (!user.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await sendNewLikeEmail(
      user.rows[0].email,
      user.rows[0].username,
      'Test Liker',
      999,
      'Test Article Title'
    );

    res.json({ message: 'Test like email sent', result });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

module.exports = router;
