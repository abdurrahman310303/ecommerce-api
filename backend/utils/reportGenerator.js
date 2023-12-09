const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Analytics = require('../models/Analytics');

const generateSalesReport = async (startDate, endDate, userId = null) => {
  try {
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (userId) {
      dateFilter.user = userId;
    }

    const orders = await Order.find(dateFilter)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name price category')
      .sort({ createdAt: -1 });

    const totalRevenue = orders.reduce((sum, order) => {
      return order.status !== 'cancelled' ? sum + order.totalAmount : sum;
    }, 0);

    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const productSales = {};
    const categorySales = {};
    
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach(item => {
          if (item.product) {
            const productId = item.product._id.toString();
            const categoryName = item.product.category;
            
            if (!productSales[productId]) {
              productSales[productId] = {
                product: item.product,
                quantity: 0,
                revenue: 0
              };
            }
            
            productSales[productId].quantity += item.quantity;
            productSales[productId].revenue += item.price * item.quantity;
            
            if (!categorySales[categoryName]) {
              categorySales[categoryName] = {
                quantity: 0,
                revenue: 0
              };
            }
            
            categorySales[categoryName].quantity += item.quantity;
            categorySales[categoryName].revenue += item.price * item.quantity;
          }
        });
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topCategories = Object.entries(categorySales)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([category, data]) => ({ category, ...data }));

    return {
      summary: {
        totalOrders: orders.length,
        totalRevenue: totalRevenue,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        ordersByStatus
      },
      topProducts,
      topCategories,
      dateRange: { startDate, endDate }
    };

  } catch (error) {
    throw error;
  }
};

const generateUserReport = async (startDate, endDate) => {
  try {
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const newUsers = await User.find(dateFilter).sort({ createdAt: -1 });
    
    const userOrders = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 20
      }
    ]);

    const usersByRegistrationDate = {};
    newUsers.forEach(user => {
      const date = user.createdAt.toISOString().split('T')[0];
      usersByRegistrationDate[date] = (usersByRegistrationDate[date] || 0) + 1;
    });

    return {
      summary: {
        newUsersCount: newUsers.length,
        activeCustomersCount: userOrders.length
      },
      newUsers: newUsers.slice(0, 20),
      topCustomers: userOrders,
      registrationTrend: usersByRegistrationDate,
      dateRange: { startDate, endDate }
    };

  } catch (error) {
    throw error;
  }
};

const generateProductReport = async (startDate, endDate) => {
  try {
    const orderItems = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    const lowStockProducts = await Product.find({
      quantity: { $lt: 10 }
    }).sort({ quantity: 1 });

    const categoryPerformance = {};
    orderItems.forEach(item => {
      const category = item.productInfo.category;
      if (!categoryPerformance[category]) {
        categoryPerformance[category] = {
          revenue: 0,
          quantity: 0,
          productCount: 0
        };
      }
      categoryPerformance[category].revenue += item.totalRevenue;
      categoryPerformance[category].quantity += item.totalQuantity;
      categoryPerformance[category].productCount += 1;
    });

    return {
      topPerforming: orderItems.slice(0, 20),
      lowStock: lowStockProducts,
      categoryPerformance,
      dateRange: { startDate, endDate }
    };

  } catch (error) {
    throw error;
  }
};

const generateAnalyticsReport = async (startDate, endDate) => {
  try {
    const analyticsData = await Analytics.find({
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ timestamp: -1 });

    const eventCounts = analyticsData.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    const pageViews = analyticsData.filter(event => event.eventType === 'page_view');
    const uniqueUsers = new Set(analyticsData.map(event => event.userId?.toString()).filter(Boolean));

    const popularPages = pageViews.reduce((acc, view) => {
      const page = view.data.page || view.data.path || 'unknown';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {});

    const deviceTypes = analyticsData.reduce((acc, event) => {
      const device = event.deviceInfo?.type || 'unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    const sessionsByDay = {};
    analyticsData.forEach(event => {
      const day = event.timestamp.toISOString().split('T')[0];
      sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
    });

    return {
      summary: {
        totalEvents: analyticsData.length,
        uniqueUsers: uniqueUsers.size,
        totalPageViews: pageViews.length
      },
      eventBreakdown: eventCounts,
      popularPages: Object.entries(popularPages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [page, count]) => {
          acc[page] = count;
          return acc;
        }, {}),
      deviceBreakdown: deviceTypes,
      dailyActivity: sessionsByDay,
      dateRange: { startDate, endDate }
    };

  } catch (error) {
    throw error;
  }
};

const generateComprehensiveReport = async (startDate, endDate) => {
  try {
    const [salesReport, userReport, productReport, analyticsReport] = await Promise.all([
      generateSalesReport(startDate, endDate),
      generateUserReport(startDate, endDate),
      generateProductReport(startDate, endDate),
      generateAnalyticsReport(startDate, endDate)
    ]);

    return {
      generatedAt: new Date(),
      dateRange: { startDate, endDate },
      sales: salesReport,
      users: userReport,
      products: productReport,
      analytics: analyticsReport
    };

  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateSalesReport,
  generateUserReport,
  generateProductReport,
  generateAnalyticsReport,
  generateComprehensiveReport
};
