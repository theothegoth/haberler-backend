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

// Preview email templates in browser (HTML view)
router.get('/preview/follower', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(to right, #10b981, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🎉 New Follower!</h1></div>
        <div class="content">
          <h2>Hello TestUser,</h2>
          <p><strong>John Doe</strong> just started following you on Gaste!</p>
          <p>They'll now see your articles in their feed and get notifications about your new posts.</p>
          <p style="text-align: center;">
            <a href="http://localhost:3000/profile/123" class="button">
              View John Doe's Profile
            </a>
          </p>
        </div>
        <div class="footer">
          <p><a href="http://localhost:3000/settings" style="color: #3b82f6;">Update notification preferences</a></p>
          <p>&copy; 2025 Gaste. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

router.get('/preview/comment', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(to right, #8b5cf6, #ec4899); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .comment { background: white; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: linear-gradient(to right, #8b5cf6, #ec4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>💬 New Comment</h1></div>
        <div class="content">
          <h2>Hello TestUser,</h2>
          <p><strong>Jane Smith</strong> commented on your article "<strong>How to Build a News Platform</strong>":</p>
          <div class="comment">"This is an amazing tutorial! I learned so much from this article. Thank you for sharing!"</div>
          <p style="text-align: center;">
            <a href="http://localhost:3000/article/456#comments" class="button">
              View Comment & Reply
            </a>
          </p>
        </div>
        <div class="footer">
          <p><a href="http://localhost:3000/settings" style="color: #8b5cf6;">Update notification preferences</a></p>
          <p>&copy; 2025 Gaste. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

router.get('/preview/like', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(to right, #ef4444, #ec4899); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .article { background: white; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .button { display: inline-block; background: linear-gradient(to right, #ef4444, #ec4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>❤️ New Like</h1></div>
        <div class="content">
          <h2>Hello TestUser,</h2>
          <p><strong>Mike Johnson</strong> liked your article:</p>
          <div class="article"><strong>The Future of Web Development in 2025</strong></div>
          <p style="text-align: center;">
            <a href="http://localhost:3000/article/789" class="button">
              View Article
            </a>
          </p>
        </div>
        <div class="footer">
          <p><a href="http://localhost:3000/settings" style="color: #ef4444;">Update notification preferences</a></p>
          <p>&copy; 2025 Gaste. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

router.get('/preview/digest', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 650px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .header { background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f3f4f6; padding: 30px; border-radius: 0 0 10px 10px; }
        .article { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .article h3 { margin: 0 0 10px 0; color: #1f2937; }
        .article .meta { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
        .article p { color: #4b5563; margin: 10px 0; }
        .button { display: inline-block; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 14px; margin-top: 10px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📰 Weekly Top Stories</h1>
          <p>The most popular articles this week on Gaste</p>
        </div>
        <div class="content">
          <h2 style="color: #1f2937;">Hello TestUser,</h2>
          <p>Here are the top 3 most-read and most-liked articles from this week:</p>

          <div class="article">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">#1 Top Story</div>
            <h3>AI Revolution: How Machine Learning is Changing Everything</h3>
            <div class="meta">By Sarah Connor • 245 likes • 1,523 views</div>
            <p>Artificial intelligence and machine learning are transforming industries at an unprecedented pace. From healthcare to finance, AI is revolutionizing how we work and live...</p>
            <a href="http://localhost:3000/article/101" class="button">Read More →</a>
          </div>

          <div class="article">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">#2 Top Story</div>
            <h3>10 Tips for Better Code Reviews</h3>
            <div class="meta">By John Developer • 189 likes • 987 views</div>
            <p>Code reviews are an essential part of the development process. Here are ten practical tips to make your code reviews more effective and collaborative...</p>
            <a href="http://localhost:3000/article/102" class="button">Read More →</a>
          </div>

          <div class="article">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">#3 Top Story</div>
            <h3>The Rise of Edge Computing in 2025</h3>
            <div class="meta">By Tech Weekly • 156 likes • 876 views</div>
            <p>Edge computing is moving data processing closer to the source. This paradigm shift is enabling faster response times and reducing bandwidth costs...</p>
            <a href="http://localhost:3000/article/103" class="button">Read More →</a>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/feed" style="display: inline-block; background: linear-gradient(to right, #10b981, #3b82f6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Explore More Articles
            </a>
          </div>
        </div>
        <div class="footer">
          <p>You're receiving this because you subscribed to weekly digests.</p>
          <p><a href="http://localhost:3000/settings" style="color: #3b82f6;">Update email preferences</a></p>
          <p>&copy; 2025 Gaste. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

module.exports = router;
