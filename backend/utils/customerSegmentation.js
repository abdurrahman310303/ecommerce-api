const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Analytics = require('../models/Analytics');

const segmentCustomers = async () => {
  try {
    const segments = {
      new_customers: [],
      returning_customers: [],
      vip_customers: [],
      at_risk_customers: [],
      high_value_customers: [],
      frequent_buyers: []
    };

    const users = await User.find({ role: 'user' }).lean();

    for (const user of users) {
      const userOrders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });
      const totalSpent = userOrders.reduce((sum, order) => sum + order.totalPrice, 0);
      const orderCount = userOrders.length;
      
      const lastOrderDate = userOrders.length > 0 ? userOrders[0].createdAt : null;
      const daysSinceLastOrder = lastOrderDate ? 
        Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24)) : null;

      const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
      
      const userSegment = {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        totalSpent,
        orderCount,
        avgOrderValue,
        lastOrderDate,
        daysSinceLastOrder,
        registrationDate: user.createdAt
      };

      if (orderCount === 0) {
        segments.new_customers.push(userSegment);
      } else if (totalSpent >= 1000) {
        segments.vip_customers.push(userSegment);
      } else if (totalSpent >= 500) {
        segments.high_value_customers.push(userSegment);
      } else if (orderCount >= 5) {
        segments.frequent_buyers.push(userSegment);
      } else if (daysSinceLastOrder && daysSinceLastOrder > 90) {
        segments.at_risk_customers.push(userSegment);
      } else {
        segments.returning_customers.push(userSegment);
      }
    }

    return segments;
  } catch (error) {
    throw error;
  }
};

const getCustomerLifetimeValue = async (userId) => {
  try {
    const orders = await Order.find({ userId, status: { $in: ['completed', 'delivered'] } });
    const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    
    const firstOrder = orders.sort((a, b) => a.createdAt - b.createdAt)[0];
    const customerAge = firstOrder ? 
      Math.floor((new Date() - firstOrder.createdAt) / (1000 * 60 * 60 * 24)) : 0;
    
    const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
    const orderFrequency = customerAge > 0 ? orders.length / (customerAge / 30) : 0;
    
    const predictedLifetimeValue = avgOrderValue * orderFrequency * 24;

    return {
      totalSpent,
      orderCount: orders.length,
      avgOrderValue,
      customerAge,
      orderFrequency,
      predictedLifetimeValue
    };
  } catch (error) {
    throw error;
  }
};

const getChurnRiskScore = async (userId) => {
  try {
    const user = await User.findById(userId);
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    
    if (orders.length === 0) {
      return { riskScore: 0.1, riskLevel: 'low', factors: ['new_customer'] };
    }

    const lastOrder = orders[0];
    const daysSinceLastOrder = Math.floor((new Date() - lastOrder.createdAt) / (1000 * 60 * 60 * 24));
    
    const totalOrders = orders.length;
    const avgDaysBetweenOrders = totalOrders > 1 ? 
      Math.floor((orders[0].createdAt - orders[orders.length - 1].createdAt) / (1000 * 60 * 60 * 24) / (totalOrders - 1)) : 
      30;

    let riskScore = 0;
    let factors = [];

    if (daysSinceLastOrder > avgDaysBetweenOrders * 2) {
      riskScore += 0.4;
      factors.push('overdue_order');
    }

    if (daysSinceLastOrder > 90) {
      riskScore += 0.3;
      factors.push('long_absence');
    }

    if (totalOrders === 1) {
      riskScore += 0.2;
      factors.push('single_order');
    }

    const recentOrders = orders.filter(order => {
      const daysSince = Math.floor((new Date() - order.createdAt) / (1000 * 60 * 60 * 24));
      return daysSince <= 90;
    });

    if (recentOrders.length < 2 && totalOrders > 2) {
      riskScore += 0.25;
      factors.push('declining_frequency');
    }

    const hasRecentSupport = await Analytics.findOne({
      userId,
      type: 'support_contact',
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    if (hasRecentSupport) {
      riskScore += 0.15;
      factors.push('recent_support');
    }

    riskScore = Math.min(riskScore, 1);

    let riskLevel;
    if (riskScore >= 0.7) riskLevel = 'high';
    else if (riskScore >= 0.4) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      riskScore: Math.round(riskScore * 100) / 100,
      riskLevel,
      factors,
      daysSinceLastOrder,
      avgDaysBetweenOrders
    };
  } catch (error) {
    throw error;
  }
};

const getProductAffinityScore = async (userId, productId) => {
  try {
    const userOrders = await Order.find({ userId })
      .populate('items.productId');

    const productViews = await Analytics.countDocuments({
      userId,
      type: 'product_view',
      productId
    });

    const productPurchases = userOrders.reduce((count, order) => {
      const purchased = order.items.some(item => 
        item.productId && item.productId._id.toString() === productId
      );
      return purchased ? count + 1 : count;
    }, 0);

    const categoryPurchases = await Product.findById(productId);
    if (!categoryPurchases) return 0;

    const categoryOrderCount = userOrders.reduce((count, order) => {
      const hasCategoryProduct = order.items.some(item =>
        item.productSnapshot && 
        item.productSnapshot.category === categoryPurchases.category.toString()
      );
      return hasCategoryProduct ? count + 1 : count;
    }, 0);

    let affinityScore = 0;

    affinityScore += productViews * 0.1;
    affinityScore += productPurchases * 0.4;
    affinityScore += categoryOrderCount * 0.2;

    if (productPurchases > 0) {
      affinityScore += 0.3;
    }

    return Math.min(affinityScore, 1);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  segmentCustomers,
  getCustomerLifetimeValue,
  getChurnRiskScore,
  getProductAffinityScore
};
