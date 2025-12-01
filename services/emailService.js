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

const sendNewLikeEmail = async (to, username, likerName, articleTitle, articleId) => {
  const articleUrl = `${process.env.FRONTEND_URL || 'https://www.gastehub.com'}/article/${articleId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Yeni Beğeni!</h2>
      <p>Merhaba ${username},</p>
      <p><strong>${likerName}</strong> makaleni beğendi:</p>
      <p><a href="${articleUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${articleTitle}</a></p>
    </div>
  `;
  return sendEmail(to, 'Makaleniz Beğenildi', html);
};

const sendNewCommentEmail = async (to, username, commenterName, articleTitle, articleId, commentContent) => {
  const articleUrl = `${process.env.FRONTEND_URL || 'https://www.gastehub.com'}/article/${articleId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Yeni Yorum!</h2>
      <p>Merhaba ${username},</p>
      <p><strong>${commenterName}</strong> makalene yorum yaptı:</p>
      <p><a href="${articleUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">${articleTitle}</a></p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0; font-style: italic;">
        "${commentContent}"
      </div>
    </div>
  `;
  return sendEmail(to, 'Makalenize Yorum Yapıldı', html);
};

const sendNewFollowerEmail = async (to, username, followerName, followerId) => {
  const followerUrl = `${process.env.FRONTEND_URL || 'https://www.gastehub.com'}/user/${followerId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Yeni Takipçi!</h2>
      <p>Merhaba ${username},</p>
      <p><strong>${followerName}</strong> seni takip etmeye başladı!</p>
      <p><a href="${followerUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">Profilini Görüntüle</a></p>
    </div>
  `;
  return sendEmail(to, 'Yeni Takipçiniz Var', html);
};

const sendWeeklyDigestEmail = async (to, username, articles) => {
  const articlesList = articles.map(article => `
    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
      <h3 style="margin: 0 0 10px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://www.gastehub.com'}/article/${article.id}" style="color: #2563eb; text-decoration: none;">
          ${article.title}
        </a>
      </h3>
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
        ${article.username} tarafından • ${new Date(article.created_at).toLocaleDateString('tr-TR')}
      </p>
      <p style="margin: 0; color: #444;">
        ${article.content ? article.content.substring(0, 150).replace(/<[^>]*>?/gm, '') : ''}...
      </p>
    </div>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Haftalık Bülten</h2>
      <p>Merhaba ${username},</p>
      <p>Bu hafta GasteHub'da öne çıkan makaleler:</p>
      <div style="margin-top: 30px;">
        ${articlesList}
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
        <p>Bu e-postayı, haftalık bülten tercihinize istinaden alıyorsunuz.</p>
        <a href="${process.env.FRONTEND_URL || 'https://www.gastehub.com'}/settings" style="color: #888;">Tercihleri Yönet</a>
      </div>
    </div>
  `;

  return sendEmail(to, 'GasteHub Haftalık Bülten', html);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendNewLikeEmail,
  sendNewCommentEmail,
  sendNewFollowerEmail,
  sendWeeklyDigestEmail,
  generateVerificationToken
};
