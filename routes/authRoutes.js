const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const upload = require('../config/upload');
const { uploadLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', authenticate, getProfile);
router.get('/user/:userId', getPublicProfile);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);
router.put('/password', authenticate, changePasswordValidation, changePassword);
router.post('/upload-profile-picture', authenticate, uploadLimiter, upload.single('profilePicture'), uploadProfilePicture);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordValidation, resetPassword);

module.exports = router;
