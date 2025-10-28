const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendVerificationEmail, sendWelcomeEmail, generateVerificationToken } = require('../services/emailService');
const { authenticate } = require('../middleware/auth');

// Verify email with token
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by token
    const user = await User.findByVerificationToken(token);

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired verification token'
      });
    }

    // Verify the email
    await User.verifyEmail(user.id);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.username).catch(err => {
      console.error('[EMAIL] Failed to send welcome email:', err);
    });

    res.json({
      message: 'Email verified successfully! You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: true
      }
    });
  } catch (error) {
    console.error('[EMAIL VERIFICATION] Error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Resend verification email
router.post('/resend', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new token
    const token = generateVerificationToken();
    await User.setVerificationToken(userId, token);

    // Send verification email
    await sendVerificationEmail(user.email, user.username, token);

    res.json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('[EMAIL RESEND] Error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Check verification status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const isVerified = await User.isEmailVerified(userId);

    res.json({
      emailVerified: isVerified
    });
  } catch (error) {
    console.error('[EMAIL STATUS] Error:', error);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

module.exports = router;
