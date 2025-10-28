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

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendWelcomeEmail
};
