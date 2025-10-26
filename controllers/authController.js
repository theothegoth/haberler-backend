const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
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
    const token = generateToken(user);

    res.status(201).json({
      message: 'Kayıt başarılı!',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        countryCode: user.country_code
      }
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

    const token = generateToken(user);

    res.json({
      message: 'Giriş başarılı!',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        countryCode: user.country_code
      }
    });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ error: 'Giriş işlemi başarısız oldu.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        countryCode: user.country_code,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Profil getirme hatası:', error);
    res.status(500).json({ error: 'Profil bilgileri alınamadı.' });
  }
};

const registerValidation = [
  body('email').isEmail().withMessage('Geçerli bir email adresi giriniz.'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır.'),
  body('username').isLength({ min: 3 }).withMessage('Kullanıcı adı en az 3 karakter olmalıdır.'),
  body('countryCode').optional().isLength({ min: 2, max: 2 }).withMessage('Ülke kodu 2 karakter olmalıdır.')
];

const loginValidation = [
  body('email').isEmail().withMessage('Geçerli bir email adresi giriniz.'),
  body('password').notEmpty().withMessage('Şifre gereklidir.')
];

module.exports = {
  register,
  login,
  getProfile,
  registerValidation,
  loginValidation
};

