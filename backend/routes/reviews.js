const express = require('express');
const { body } = require('express-validator');
const {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  voteReview,
  replyToReview
} = require('../controllers/reviews');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

router.post('/', protect, [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('comment').trim().isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters'),
  validate
], createReview);

router.get('/product/:productId', getProductReviews);
router.get('/user', protect, getUserReviews);

router.put('/:id', protect, [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('title').optional().trim().isLength({ min: 5, max: 100 }),
  body('comment').optional().trim().isLength({ min: 10, max: 500 }),
  validate
], updateReview);

router.delete('/:id', protect, deleteReview);

router.post('/:id/vote', protect, [
  body('helpful').isBoolean().withMessage('Helpful must be a boolean value'),
  validate
], voteReview);

router.post('/:id/reply', protect, authorize('admin', 'vendor'), [
  body('message').trim().isLength({ min: 5, max: 300 }).withMessage('Reply must be between 5 and 300 characters'),
  validate
], replyToReview);

module.exports = router;
