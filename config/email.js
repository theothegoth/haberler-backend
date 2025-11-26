const nodemailer = require('nodemailer');

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true' || false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Create transporter
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  Email credentials not configured. Email functionality will be disabled.');
    return null;
  }

  try {
    const transporter = nodemailer.createTransporter(emailConfig);
    return transporter;
  } catch (error) {
    console.error('❌ Error creating email transporter:', error);
    return null;
  }
};

const transporter = createTransporter();

// Verify connection on startup
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email service verification failed:', error);
    }
  });
}

module.exports = transporter;
