const express = require('express');
const { body } = require('express-validator');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree
} = require('../controllers/categories');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validation');

const router = express.Router();

router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/:id', getCategory);

router.post('/', protect, authorize('admin'), [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters'),
  body('description').trim().isLength({ min: 5 }).withMessage('Description must be at least 5 characters long'),
  validate
], createCategory);

router.put('/:id', protect, authorize('admin'), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ min: 5 }),
  validate
], updateCategory);

router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
