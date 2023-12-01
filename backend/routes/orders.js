const express = require('express');
const { body } = require('express-validator');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
} = require('../controllers/orders');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

router.post('/', protect, [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('shippingAddress.street').notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Zip code is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
  body('paymentInfo.method').isIn(['card', 'paypal', 'bank_transfer', 'cash_on_delivery']).withMessage('Invalid payment method'),
  validate
], createOrder);

router.get('/', protect, getOrders);
router.get('/stats', protect, authorize('admin'), getOrderStats);
router.get('/:id', protect, getOrder);

router.put('/:id/status', protect, authorize('admin'), [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']).withMessage('Invalid order status'),
  validate
], updateOrderStatus);

router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
