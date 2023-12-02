const express = require('express');
const {
  getInventoryReport,
  getSalesReport,
  getCustomerReport
} = require('../controllers/reports');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/inventory', getInventoryReport);
router.get('/sales', getSalesReport);
router.get('/customers', getCustomerReport);

module.exports = router;
