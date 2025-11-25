const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');
const { generateVerificationToken, sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password, username, countryCode } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Bu email adresi zaten kayıtlı.' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }

    const user = await User.create({ email, password, username, countryCode });

    // Generate verification token and send email
    const verificationToken = generateVerificationToken();
    await User.setVerificationToken(user.id, verificationToken);

    // Send verification email (non-blocking)
    sendVerificationEmail(user.email, user.username, verificationToken).catch(err => {
      console.error('[REGISTER] Failed to send verification email:', err);
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        countryCode: user.country_code,
        emailVerified: false
      },
      requiresVerification: true
    });
  } catch (error) {
    console.error('Kayıt hatası:', error);

    // Handle PostgreSQL unique constraint violations
    if (error.code === '23505') {
      if (error.constraint === 'users_email_key') {
        return res.status(400).json({ error: 'Bu email adresi zaten kayıtlı.' });
      }
      if (error.constraint === 'users_username_key') {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
      }
      return res.status(400).json({ error: 'Bu bilgiler zaten kullanılıyor.' });
    }

    res.status(500).json({ error: 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email veya şifre hatalı.' });
    }

    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email veya şifre hatalı.' });
    }

    // Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({
        error: 'Your account has been banned. Please contact support for more information.',
        banned: true,
        banReason: user.ban_reason
      });
    }

    // Check if email is verified (warning, but allow login)
    const emailVerified = user.email_verified || false;

    const token = generateToken(user);

    res.json({
      message: 'Giriş başarılı!',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        countryCode: user.country_code,
        emailVerified: emailVerified,
        role: user.role || 'user'
      },
      requiresVerification: !emailVerified
    });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ error: 'Giriş işlemi başarısız oldu.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user?.id || req.user?.userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        bio: user.bio,
        profile_picture: user.profile_picture,
        countryCode: user.country_code,
        createdAt: user.created_at,
        emailVerified: user.email_verified || false
      }
    });
  } catch (error) {
    console.error('Profil getirme hatası:', error);
    res.status(500).json({ error: 'Profil bilgileri alınamadı.' });
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findPublicProfile(userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        profile_picture: user.profile_picture,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Public profil getirme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı profili alınamadı.' });
  }
};

const registerValidation = [
  body('email').isEmail().withMessage('Geçerli bir email adresi giriniz.'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır.'),
  body('username').isLength({ min: 3 }).withMessage('Kullanıcı adı en az 3 karakter olmalıdır.'),
  body('countryCode').optional().isLength({ min: 2, max: 2 }).withMessage('Ülke kodu 2 karakter olmalıdır.')
];

const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { username, email, bio } = req.body;

    // Check if username is taken by another user
    if (username) {
      const existingUsername = await User.findByUsername(username);
      if (existingUsername && existingUsername.id !== userId) {
        return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
      }
    }

    // Check if email is taken by another user
    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ error: 'Bu email adresi zaten kayıtlı.' });
      }
    }

    const updatedUser = await User.updateProfile(userId, { username, email, bio });

    res.json({
      message: 'Profil başarıyla güncellendi',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        bio: updatedUser.bio,
        profile_picture: updatedUser.profile_picture,
        countryCode: updatedUser.country_code,
        emailVerified: updatedUser.email_verified || false
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Profil güncellenirken bir hata oluştu.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    const user = await User.findByIdWithPassword(userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const isValidPassword = await User.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Mevcut şifre hatalı.' });
    }

    await User.updatePassword(userId, newPassword);

    res.json({ message: 'Şifre başarıyla değiştirildi' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Şifre değiştirilirken bir hata oluştu.' });
  }
};

const loginValidation = [
  body('email').isEmail().withMessage('Geçerli bir email adresi giriniz.'),
  body('password').notEmpty().withMessage('Şifre gereklidir.')
];

const updateProfileValidation = [
  body('username').optional().isLength({ min: 3 }).withMessage('Kullanıcı adı en az 3 karakter olmalıdır.'),
  body('email').optional().isEmail().withMessage('Geçerli bir email adresi giriniz.'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio en fazla 500 karakter olabilir.')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Mevcut şifre gereklidir.'),
  body('newPassword').isLength({ min: 6 }).withMessage('Yeni şifre en az 6 karakter olmalıdır.')
];

const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen bir resim dosyası seçin.' });
    }

    // Build the profile picture URL
    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

    // Update user's profile picture in database
    const updatedUser = await User.updateProfilePicture(userId, profilePictureUrl);

    res.json({
      message: 'Profil fotoğrafı başarıyla güncellendi',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        bio: updatedUser.bio,
        profile_picture: updatedUser.profile_picture,
        countryCode: updatedUser.country_code,
        emailVerified: updatedUser.email_verified || false
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Profil fotoğrafı yüklenirken bir hata oluştu.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: 'Şifre sıfırlama bağlantısı email adresinize gönderildi.'
      });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    await User.setResetToken(email, resetToken, 1); // 1 hour expiry

    // Send reset email
    sendPasswordResetEmail(user.email, user.username, resetToken).catch(err => {
      console.error('[FORGOT_PASSWORD] Failed to send reset email:', err);
    });

    res.json({
      message: 'Şifre sıfırlama bağlantısı email adresinize gönderildi.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { token, newPassword } = req.body;

    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({
        error: 'Geçersiz veya süresi dolmuş bağlantı. Lütfen yeni bir şifre sıfırlama talebi oluşturun.'
      });
    }

    // Reset password
    await User.resetPassword(user.id, newPassword);

    res.json({
      message: 'Şifreniz başarıyla değiştirildi. Şimdi giriş yapabilirsiniz.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Şifre sıfırlama başarısız oldu. Lütfen tekrar deneyin.' });
  }
};

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Geçerli bir email adresi giriniz.')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token gereklidir.'),
  body('newPassword').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır.')
];

module.exports = {
  register,
  login,
  getProfile,
  getPublicProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture,
  forgotPassword,
  resetPassword,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation
};
