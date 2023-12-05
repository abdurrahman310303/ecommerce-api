const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');

exports.getInventoryStats = async (req, res) => {
  try {
    const lowStockThreshold = req.query.threshold || 10;

    const lowStockProducts = await Product.find({
      quantity: { $lt: lowStockThreshold },
      trackQuantity: true,
      isActive: true
    }).populate('category', 'name');

    const outOfStockProducts = await Product.find({
      quantity: { $eq: 0 },
      trackQuantity: true,
      isActive: true
    }).populate('category', 'name');

    const totalValue = await Product.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        lowStockProducts,
        outOfStockProducts,
        stats: totalValue[0] || { totalValue: 0, totalProducts: 0, totalQuantity: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const { productId, quantity, reason, notes } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousQuantity = product.quantity;
    const newQuantity = previousQuantity + quantity;

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock for adjustment'
      });
    }

    product.quantity = newQuantity;
    await product.save();

    await InventoryLog.create({
      productId,
      type: 'adjustment',
      quantity: Math.abs(quantity),
      previousQuantity,
      newQuantity,
      reason,
      userId: req.user._id,
      notes
    });

    res.status(200).json({
      success: true,
      data: {
        product,
        previousQuantity,
        newQuantity,
        adjustment: quantity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getInventoryLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.productId) filters.productId = req.query.productId;
    if (req.query.type) filters.type = req.query.type;
    if (req.query.startDate || req.query.endDate) {
      filters.createdAt = {};
      if (req.query.startDate) filters.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filters.createdAt.$lte = new Date(req.query.endDate);
    }

    const logs = await InventoryLog.find(filters)
      .populate('productId', 'name sku')
      .populate('userId', 'firstName lastName')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalLogs = await InventoryLog.countDocuments(filters);
    const totalPages = Math.ceil(totalLogs / limit);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalLogs,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.bulkUpdateStock = async (req, res) => {
  try {
    const { updates, reason } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { productId, quantity } = update;
        
        const product = await Product.findById(productId);
        if (!product) {
          errors.push({ productId, error: 'Product not found' });
          continue;
        }

        const previousQuantity = product.quantity;
        product.quantity = quantity;
        await product.save();

        await InventoryLog.create({
          productId,
          type: 'adjustment',
          quantity: Math.abs(quantity - previousQuantity),
          previousQuantity,
          newQuantity: quantity,
          reason: reason || 'Bulk update',
          userId: req.user._id
        });

        results.push({
          productId,
          previousQuantity,
          newQuantity: quantity,
          success: true
        });
      } catch (error) {
        errors.push({ productId: update.productId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getStockMovements = async (req, res) => {
  try {
    const { productId, days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const filters = {
      createdAt: { $gte: startDate }
    };

    if (productId) {
      filters.productId = productId;
    }

    const movements = await InventoryLog.aggregate([
      { $match: filters },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          movements: {
            $push: {
              type: '$_id.type',
              count: '$count',
              quantity: '$totalQuantity'
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { movements }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
