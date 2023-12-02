const Product = require('../models/Product');
const Order = require('../models/Order');

exports.getInventoryReport = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      quantity: { $lt: 10 },
      trackQuantity: true,
      isActive: true
    }).select('name sku quantity price category').populate('category', 'name');

    const outOfStockProducts = await Product.find({
      quantity: { $lte: 0 },
      trackQuantity: true,
      isActive: true
    }).select('name sku quantity price category').populate('category', 'name');

    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$quantity'] } } } }
    ]);

    res.status(200).json({
      success: true,
      inventory: {
        totalProducts,
        totalValue: totalValue[0]?.total || 0,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        lowStockProducts,
        outOfStockProducts
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;
    
    let matchCondition = {
      orderStatus: { $in: ['delivered', 'shipped'] }
    };

    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const daysBack = period === 'week' ? 7 : period === 'year' ? 365 : 30;
      matchCondition.createdAt = {
        $gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      };
    }

    const salesData = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          averageOrderValue: { $avg: '$totalPrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topSellingProducts = await Order.aggregate([
      { $match: matchCondition },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    const totalRevenue = salesData.reduce((sum, day) => sum + day.totalRevenue, 0);
    const totalOrders = salesData.reduce((sum, day) => sum + day.totalOrders, 0);

    res.status(200).json({
      success: true,
      report: {
        period,
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        },
        dailySales: salesData,
        topSellingProducts
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCustomerReport = async (req, res) => {
  try {
    const topCustomers = await Order.aggregate([
      { $match: { orderStatus: { $in: ['delivered', 'shipped'] } } },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' },
          averageOrderValue: { $avg: '$totalPrice' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          'customer.firstName': 1,
          'customer.lastName': 1,
          'customer.email': 1,
          totalOrders: 1,
          totalSpent: 1,
          averageOrderValue: 1
        }
      }
    ]);

    const customerStats = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          oneTimeCustomers: {
            $sum: { $cond: [{ $eq: ['$orderCount', 1] }, 1, 0] }
          },
          repeatCustomers: {
            $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      report: {
        customerStats: customerStats[0] || {
          totalCustomers: 0,
          oneTimeCustomers: 0,
          repeatCustomers: 0
        },
        topCustomers
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
