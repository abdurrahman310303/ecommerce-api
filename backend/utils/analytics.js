const Analytics = require('../models/Analytics');

const trackEvent = async (req, eventType, metadata = {}) => {
  try {
    const analyticsData = {
      type: eventType,
      userId: req.user ? req.user._id : null,
      sessionId: req.sessionID || req.ip,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referrer'),
      metadata
    };

    if (req.params.productId || req.body.productId || metadata.productId) {
      analyticsData.productId = req.params.productId || req.body.productId || metadata.productId;
    }

    if (req.params.categoryId || metadata.categoryId) {
      analyticsData.categoryId = req.params.categoryId || metadata.categoryId;
    }

    if (req.params.orderId || metadata.orderId) {
      analyticsData.orderId = req.params.orderId || metadata.orderId;
    }

    await Analytics.create(analyticsData);
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

const getAnalyticsData = async (filters = {}) => {
  try {
    const { type, startDate, endDate, userId, productId } = filters;
    
    const query = {};
    if (type) query.type = type;
    if (userId) query.userId = userId;
    if (productId) query.productId = productId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const data = await Analytics.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'name price')
      .populate('categoryId', 'name')
      .sort({ timestamp: -1 });

    return data;
  } catch (error) {
    throw error;
  }
};

const getPopularProducts = async (limit = 10, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const popularProducts = await Analytics.aggregate([
      {
        $match: {
          type: 'product_view',
          timestamp: { $gte: startDate },
          productId: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$productId',
          viewCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productId: '$_id',
          productName: '$product.name',
          productPrice: '$product.price',
          viewCount: 1,
          uniqueUserCount: 1
        }
      },
      {
        $sort: { viewCount: -1 }
      },
      {
        $limit: limit
      }
    ]);

    return popularProducts;
  } catch (error) {
    throw error;
  }
};

const getUserEngagementStats = async (userId) => {
  try {
    const stats = await Analytics.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEvents = stats.reduce((sum, stat) => sum + stat.count, 0);
    const eventBreakdown = stats.reduce((obj, stat) => {
      obj[stat._id] = stat.count;
      return obj;
    }, {});

    const lastActivity = await Analytics.findOne({ userId })
      .sort({ timestamp: -1 })
      .select('timestamp');

    return {
      totalEvents,
      eventBreakdown,
      lastActivity: lastActivity ? lastActivity.timestamp : null
    };
  } catch (error) {
    throw error;
  }
};

const getConversionFunnel = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const funnelData = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          type: { $in: ['product_view', 'add_to_cart', 'purchase'] }
        }
      },
      {
        $group: {
          _id: '$type',
          uniqueUsers: { $addToSet: '$userId' },
          totalEvents: { $sum: 1 }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      }
    ]);

    const funnel = {};
    funnelData.forEach(item => {
      funnel[item._id] = {
        totalEvents: item.totalEvents,
        uniqueUsers: item.uniqueUserCount
      };
    });

    return funnel;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  trackEvent,
  getAnalyticsData,
  getPopularProducts,
  getUserEngagementStats,
  getConversionFunnel
};
