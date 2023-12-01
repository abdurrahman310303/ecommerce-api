const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  updateAvatar,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/users');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

router.get('/profile', protect, getProfile);

router.put('/profile', protect, [
  body('firstName').optional().trim().isLength({ min: 2, max: 30 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 30 }),
  body('phone').optional().isMobilePhone(),
  validate
], updateProfile);

router.put('/avatar', protect, updateAvatar);

router.post('/addresses', protect, [
  body('street').notEmpty().withMessage('Street address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('zipCode').notEmpty().withMessage('Zip code is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('type').optional().isIn(['home', 'work', 'other']),
  validate
], addAddress);

router.put('/addresses/:addressId', protect, [
  body('street').optional().notEmpty(),
  body('city').optional().notEmpty(),
  body('zipCode').optional().notEmpty(),
  body('country').optional().notEmpty(),
  body('type').optional().isIn(['home', 'work', 'other']),
  validate
], updateAddress);

router.delete('/addresses/:addressId', protect, deleteAddress);

router.put('/addresses/:addressId/default', protect, setDefaultAddress);

module.exports = router;
