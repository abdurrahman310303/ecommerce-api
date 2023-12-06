const Product = require('../models/Product');
const Order = require('../models/Order');
const Analytics = require('../models/Analytics');

const getRecommendationsForUser = async (userId, limit = 10) => {
  try {
    const userOrders = await Order.find({ userId })
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .limit(10);

    const userViewedProducts = await Analytics.find({
      userId,
      type: 'product_view',
      productId: { $exists: true }
    })
      .populate('productId')
      .sort({ timestamp: -1 })
      .limit(20);

    const purchasedCategories = [];
    const purchasedProducts = [];
    
    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.productSnapshot && item.productSnapshot.category) {
          purchasedCategories.push(item.productSnapshot.category);
        }
        if (item.productId) {
          purchasedProducts.push(item.productId.toString());
        }
      });
    });

    const viewedCategories = [];
    const viewedProducts = [];
    
    userViewedProducts.forEach(view => {
      if (view.productId && view.productId.category) {
        viewedCategories.push(view.productId.category.toString());
      }
      if (view.productId) {
        viewedProducts.push(view.productId._id.toString());
      }
    });

    const allInteractedProducts = [...new Set([...purchasedProducts, ...viewedProducts])];
    const categoryPreferences = [...new Set([...purchasedCategories, ...viewedCategories])];

    const recommendations = await Product.find({
      _id: { $nin: allInteractedProducts },
      category: { $in: categoryPreferences },
      isActive: true,
      quantity: { $gt: 0 }
    })
      .populate('category', 'name')
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit);

    if (recommendations.length < limit) {
      const popularProducts = await Product.aggregate([
        {
          $lookup: {
            from: 'analytics',
            localField: '_id',
            foreignField: 'productId',
            as: 'views'
          }
        },
        {
          $addFields: {
            viewCount: { $size: '$views' }
          }
        },
        {
          $match: {
            _id: { $nin: allInteractedProducts.map(id => id) },
            isActive: true,
            quantity: { $gt: 0 }
          }
        },
        {
          $sort: { viewCount: -1, rating: -1 }
        },
        {
          $limit: limit - recommendations.length
        }
      ]);

      await Product.populate(popularProducts, { path: 'category', select: 'name' });
      recommendations.push(...popularProducts);
    }

    return recommendations.slice(0, limit);
  } catch (error) {
    throw error;
  }
};

const getProductSimilarities = async (productId, limit = 5) => {
  try {
    const product = await Product.findById(productId).populate('category');
    if (!product) {
      throw new Error('Product not found');
    }

    const similarProducts = await Product.find({
      _id: { $ne: productId },
      category: product.category._id,
      isActive: true,
      quantity: { $gt: 0 }
    })
      .populate('category', 'name')
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit);

    if (similarProducts.length < limit) {
      const priceRange = {
        min: product.price * 0.7,
        max: product.price * 1.3
      };

      const priceBasedSimilar = await Product.find({
        _id: { $ne: productId, $nin: similarProducts.map(p => p._id) },
        price: { $gte: priceRange.min, $lte: priceRange.max },
        isActive: true,
        quantity: { $gt: 0 }
      })
        .populate('category', 'name')
        .sort({ rating: -1 })
        .limit(limit - similarProducts.length);

      similarProducts.push(...priceBasedSimilar);
    }

    return similarProducts.slice(0, limit);
  } catch (error) {
    throw error;
  }
};

const getFrequentlyBoughtTogether = async (productId, limit = 3) => {
  try {
    const ordersWithProduct = await Order.find({
      'items.productId': productId
    }).populate('items.productId');

    const productCombinations = {};

    ordersWithProduct.forEach(order => {
      const otherProducts = order.items
        .filter(item => item.productId && item.productId._id.toString() !== productId)
        .map(item => item.productId._id.toString());

      otherProducts.forEach(otherProductId => {
        productCombinations[otherProductId] = (productCombinations[otherProductId] || 0) + 1;
      });
    });

    const sortedProducts = Object.entries(productCombinations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([productId]) => productId);

    const relatedProducts = await Product.find({
      _id: { $in: sortedProducts },
      isActive: true,
      quantity: { $gt: 0 }
    }).populate('category', 'name');

    return relatedProducts;
  } catch (error) {
    throw error;
  }
};

const getTrendingProducts = async (days = 7, limit = 10) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trendingProducts = await Analytics.aggregate([
      {
        $match: {
          type: { $in: ['product_view', 'add_to_cart'] },
          timestamp: { $gte: startDate },
          productId: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$productId',
          viewCount: {
            $sum: { $cond: [{ $eq: ['$type', 'product_view'] }, 1, 0] }
          },
          cartCount: {
            $sum: { $cond: [{ $eq: ['$type', 'add_to_cart'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          trendScore: { $add: ['$viewCount', { $multiply: ['$cartCount', 2] }] }
        }
      },
      {
        $sort: { trendScore: -1 }
      },
      {
        $limit: limit
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
        $match: {
          'product.isActive': true,
          'product.quantity': { $gt: 0 }
        }
      }
    ]);

    await Product.populate(trendingProducts, { 
      path: 'product.category', 
      select: 'name' 
    });

    return trendingProducts.map(item => ({
      ...item.product,
      trendScore: item.trendScore,
      viewCount: item.viewCount,
      cartCount: item.cartCount
    }));
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getRecommendationsForUser,
  getProductSimilarities,
  getFrequentlyBoughtTogether,
  getTrendingProducts
};
