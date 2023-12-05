const express = require('express');
const {
  getInventoryStats,
  adjustStock,
  getInventoryLogs,
  bulkUpdateStock,
  getStockMovements
} = require('../controllers/inventory');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getInventoryStats);
router.post('/adjust', adjustStock);
router.get('/logs', getInventoryLogs);
router.post('/bulk-update', bulkUpdateStock);
router.get('/movements', getStockMovements);

module.exports = router;
