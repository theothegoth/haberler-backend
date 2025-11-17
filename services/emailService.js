const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create transporter based on environment
const createTransporter = () => {
  // For development, use ethereal.email (fake SMTP service)
  // For production, use actual SMTP credentials from environment variables

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Production configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Development: Log to console instead of sending
    console.log('[EMAIL] Development mode - emails will be logged to console');
    return {
      sendMail: async (mailOptions) => {
        console.log('\n[EMAIL] Would send email:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Text:', mailOptions.text);
        console.log('HTML:', mailOptions.html);
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }
};

const transporter = createTransporter();

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
const sendVerificationEmail = async (email, username, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Gaste News" <noreply@gaste.com>',
    to: email,
    subject: 'Email Verification - Gaste',
    text: `Hello ${username},\n\nPlease verify your email by clicking this link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create this account, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(to right, #3b82f6, #8b5cf6);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(to right, #3b82f6, #8b5cf6);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Gaste!</h1>
          </div>
          <div class="content">
            <h2>Hello ${username},</h2>
            <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Gaste. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending verification email:', error);
    throw error;
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, username) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Gaste News" <noreply@gaste.com>',
    to: email,
    subject: 'Welcome to Gaste!',
    text: `Hello ${username},\n\nYour email has been verified successfully! Welcome to Gaste.\n\nYou can now start:\n- Adding your favorite news channels\n- Writing your own news articles\n- Following other authors\n\nEnjoy your experience!\n\nBest regards,\nGaste Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(to right, #10b981, #3b82f6);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .feature {
            padding: 10px;
            margin: 10px 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Gaste!</h1>
          </div>
          <div class="content">
            <h2>Hello ${username},</h2>
            <p>Your email has been verified successfully! You're now part of the Gaste community.</p>
            <h3>Here's what you can do:</h3>
            <div class="feature">📺 <strong>Add your favorite news channels</strong> - Track YouTube videos from multiple sources</div>
            <div class="feature">✍️ <strong>Write your own news</strong> - Share your stories with the community</div>
            <div class="feature">👥 <strong>Follow other authors</strong> - Stay updated with content from writers you love</div>
            <p style="margin-top: 20px;">We're excited to have you here!</p>
            <p>Best regards,<br>The Gaste Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Gaste. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, username, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Gaste News" <noreply@gaste.com>',
    to: email,
    subject: 'Password Reset Request - Gaste',
    text: `Hello ${username},\n\nWe received a request to reset your password. Click the link below to reset it:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email and your password will remain unchanged.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(to right, #ef4444, #f59e0b);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(to right, #ef4444, #f59e0b);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${username},</h2>
            <p>We received a request to reset your password for your Gaste account.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #ef4444;">${resetUrl}</p>
            <div class="warning">
              <strong>⏰ This link will expire in 1 hour.</strong>
            </div>
            <p><strong>If you didn't request this password reset, please ignore this email.</strong> Your password will remain unchanged.</p>
            <p>For security reasons, never share this link with anyone.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Gaste. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending password reset email:', error);
    throw error;
  }
};

// Send weekly digest email
const sendWeeklyDigestEmail = async (email, username, articles) => {
  if (!articles || articles.length === 0) {
    return { success: false, message: 'No articles to send' };
  }

  const articlesHtml = articles.map((article, index) => `
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">#${index + 1} Top Story</div>
      <h3 style="margin: 0 0 10px 0; color: #1f2937;">${article.title}</h3>
      <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
        By ${article.username} • ${article.like_count || 0} likes • ${article.view_count || 0} views
      </div>
      <p style="color: #4b5563; margin: 10px 0;">${truncateText(article.content, 150)}</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/article/${article.id}"
         style="display: inline-block; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 14px; margin-top: 10px;">
        Read More →
      </a>
    </div>
  `).join('');

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Gaste News" <noreply@gaste.com>',
    to: email,
    subject: `📰 This Week's Top Stories on Gaste`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 650px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
          }
          .header {
            background: linear-gradient(to right, #3b82f6, #8b5cf6);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f3f4f6;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 20px;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📰 Weekly Top Stories</h1>
            <p>The most popular articles this week on Gaste</p>
          </div>
          <div class="content">
            <h2 style="color: #1f2937;">Hello ${username},</h2>
            <p>Here are the top ${articles.length} most-read and most-liked articles from this week:</p>
            ${articlesHtml}
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/feed"
                 style="display: inline-block; background: linear-gradient(to right, #10b981, #3b82f6); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                Explore More Articles
              </a>
            </div>
          </div>
          <div class="footer">
            <p>You're receiving this because you subscribed to weekly digests.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" style="color: #3b82f6;">Update email preferences</a></p>
            <p>&copy; ${new Date().getFullYear()} Gaste. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Weekly digest sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending weekly digest:', error);
    return { success: false, error: error.message };
  }
};

// Send new follower notification
const sendNewFollowerEmail = async (email, username, followerName, followerId) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Gaste News" <noreply@gaste.com>',
    to: email,
    subject: `🎉 ${followerName} started following you on Gaste`,
    html: `
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
            <h2>Hello ${username},</h2>
            <p><strong>${followerName}</strong> just started following you on Gaste!</p>
            <p>They'll now see your articles in their feed and get notifications about your new posts.</p>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/${followerId}" class="button">
                View ${followerName}'s Profile
              </a>
            </p>
          </div>
          <div class="footer">
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" style="color: #3b82f6;">Update notification preferences</a></p>
            <p>&copy; ${new Date().getFullYear()} Gaste. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] New follower notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending follower notification:', error);
    return { success: false, error: error.message };
  }
};

// Send new comment notification
const sendNewCommentEmail = async (email, username, commenterName, articleId, articleTitle, commentContent) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Gaste News" <noreply@gaste.com>',
    to: email,
    subject: `💬 ${commenterName} commented on your article`,
    html: `
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
            <h2>Hello ${username},</h2>
            <p><strong>${commenterName}</strong> commented on your article "<strong>${articleTitle}</strong>":</p>
            <div class="comment">"${truncateText(commentContent, 200)}"</div>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/article/${articleId}#comments" class="button">
                View Comment & Reply
              </a>
            </p>
          </div>
          <div class="footer">
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" style="color: #8b5cf6;">Update notification preferences</a></p>
            <p>&copy; ${new Date().getFullYear()} Gaste. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Comment notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending comment notification:', error);
    return { success: false, error: error.message };
  }
};

// Send new like notification
const sendNewLikeEmail = async (email, username, likerName, articleId, articleTitle) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Gaste News" <noreply@gaste.com>',
    to: email,
    subject: `❤️ ${likerName} liked your article`,
    html: `
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
            <h2>Hello ${username},</h2>
            <p><strong>${likerName}</strong> liked your article:</p>
            <div class="article"><strong>${articleTitle}</strong></div>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/article/${articleId}" class="button">
                View Article
              </a>
            </p>
          </div>
          <div class="footer">
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" style="color: #ef4444;">Update notification preferences</a></p>
            <p>&copy; ${new Date().getFullYear()} Gaste. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Like notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Error sending like notification:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to truncate text
const truncateText = (text, maxLength) => {
  // Strip HTML tags
  const stripped = text.replace(/<[^>]*>/g, '');
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength) + '...';
};

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendWeeklyDigestEmail,
  sendNewFollowerEmail,
  sendNewCommentEmail,
  sendNewLikeEmail
};
