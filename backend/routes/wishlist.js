const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  moveToCart
} = require('../controllers/wishlist');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getWishlist);
router.post('/add/:productId', protect, addToWishlist);
router.delete('/remove/:productId', protect, removeFromWishlist);
router.delete('/clear', protect, clearWishlist);
router.post('/move-to-cart/:productId', protect, moveToCart);

module.exports = router;
