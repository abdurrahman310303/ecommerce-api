const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  getMe
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

router.post('/register', [
  body('firstName').trim().isLength({ min: 2, max: 30 }).withMessage('First name must be between 2 and 30 characters'),
  body('lastName').trim().isLength({ min: 2, max: 30 }).withMessage('Last name must be between 2 and 30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  validate
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], login);

router.post('/logout', logout);

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  validate
], forgotPassword);

router.put('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  validate
], resetPassword);

router.get('/verify-email/:token', verifyEmail);

router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  validate
], resendVerification);

router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  validate
], changePassword);

router.get('/me', protect, getMe);

module.exports = router;
