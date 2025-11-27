const crypto = require('crypto');
const logger = require('../utils/logger').Logger;
const emailLogger = new logger('EMAIL');

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const sendEmail = async (to, subject, htmlContent) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;

  if (!apiKey || !senderEmail) {
    emailLogger.error('Brevo API Key or Sender Email is missing in .env');
    return false;
  }

  const url = 'https://api.brevo.com/v3/smtp/email';
  
  const options = {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'GasteHub' },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent
    })
  };

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      emailLogger.error(`Brevo API Error: ${JSON.stringify(errorData)}`);
      return false;
    }

    emailLogger.info(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    emailLogger.error(`Network Error sending email: ${error.message}`);
    return false;
  }
};

const sendVerificationEmail = async (to, username, token) => {
  let validToken = token;
  if (!token && username && username.length > 20) {
      validToken = username; 
  }

  const verificationUrl = `${process.env.FRONTEND_URL || 'https://www.gastehub.com'}/verify-email?token=${validToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">GasteHub'a Hoş Geldiniz ${username || ''}!</h2>
      <p>Hesabınızı doğrulamak için lütfen aşağıdaki butona tıklayın:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Email Adresimi Doğrula
        </a>
      </div>
    </div>
  `;

  return sendEmail(to, 'GasteHub Email Doğrulama', html);
};

const sendPasswordResetEmail = async (to, username, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://www.gastehub.com'}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Şifre Sıfırlama</h2>
      <p>Şifrenizi sıfırlamak için talepte bulundunuz.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Şifremi Sıfırla
        </a>
      </div>
    </div>
  `;

  return sendEmail(to, 'GasteHub Şifre Sıfırlama', html);
};

const sendWelcomeEmail = async (to, username) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Aramıza Hoş Geldin ${username || ''}!</h2>
      <p>Hesabın başarıyla doğrulandı. İyi okumalar!</p>
    </div>
  `;
  return sendEmail(to, 'GasteHub\'a Hoş Geldiniz!', html);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  generateVerificationToken
};
