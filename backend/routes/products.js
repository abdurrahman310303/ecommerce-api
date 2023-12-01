const express = require('express');
const { body } = require('express-validator');
const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  getFeaturedProducts,
  getRelatedProducts,
  getProductReviews,
  uploadProductImages
} = require('../controllers/products');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

router.get('/', getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/search', searchProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id', getProduct);
router.get('/:id/reviews', getProductReviews);
router.get('/:id/related', getRelatedProducts);

router.post('/', protect, authorize('admin', 'vendor'), [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  body('price').isNumeric().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  body('brand').trim().isLength({ min: 1 }).withMessage('Brand is required'),
  validate
], createProduct);

router.put('/:id', protect, authorize('admin', 'vendor'), [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('price').optional().isNumeric().isFloat({ min: 0 }),
  body('category').optional().isMongoId(),
  body('brand').optional().trim().isLength({ min: 1 }),
  validate
], updateProduct);

router.delete('/:id', protect, authorize('admin', 'vendor'), deleteProduct);

router.post('/:id/images', protect, authorize('admin', 'vendor'), uploadProductImages);

module.exports = router;
