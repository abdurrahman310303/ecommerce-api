const express = require('express');
const { body } = require('express-validator');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeGuestCart
} = require('../controllers/cart');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

router.get('/', protect, getCart);

router.post('/add', protect, [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  validate
], addToCart);

router.put('/update', protect, [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  validate
], updateCartItem);

router.delete('/remove/:productId', protect, removeFromCart);

router.delete('/clear', protect, clearCart);

router.post('/merge', protect, [
  body('guestCart').isArray().withMessage('Guest cart must be an array'),
  validate
], mergeGuestCart);

module.exports = router;
