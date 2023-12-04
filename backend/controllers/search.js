const Product = require('../models/Product');
const Category = require('../models/Category');
const { sanitizeSearchQuery } = require('../utils/helpers');

exports.globalSearch = async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const sanitizedQuery = sanitizeSearchQuery(q.trim());
    const regex = new RegExp(sanitizedQuery, 'i');
    const skip = (page - 1) * limit;

    let results = {
      products: [],
      categories: [],
      total: 0
    };

    if (type === 'all' || type === 'products') {
      const productQuery = {
        $and: [
          { isActive: true },
          {
            $or: [
              { name: regex },
              { description: regex },
              { brand: regex },
              { tags: { $in: [regex] } }
            ]
          }
        ]
      };

      const products = await Product.find(productQuery)
        .populate('category', 'name')
        .select('name description price images brand ratings slug')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .skip(type === 'products' ? skip : 0)
        .limit(type === 'products' ? parseInt(limit) : 5);

      results.products = products;
    }

    if (type === 'all' || type === 'categories') {
      const categoryQuery = {
        $and: [
          { isActive: true },
          {
            $or: [
              { name: regex },
              { description: regex }
            ]
          }
        ]
      };

      const categories = await Category.find(categoryQuery)
        .select('name description image slug')
        .sort({ name: 1 })
        .skip(type === 'categories' ? skip : 0)
        .limit(type === 'categories' ? parseInt(limit) : 3);

      results.categories = categories;
    }

    results.total = results.products.length + results.categories.length;

    const suggestions = await Product.find({
      isActive: true,
      $or: [
        { name: regex },
        { brand: regex }
      ]
    })
      .distinct('name')
      .limit(5);

    res.status(200).json({
      success: true,
      query: q,
      results,
      suggestions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: results.total === parseInt(limit)
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(200).json({
        success: true,
        suggestions: []
      });
    }

    const sanitizedQuery = sanitizeSearchQuery(q.trim());
    const regex = new RegExp(`^${sanitizedQuery}`, 'i');

    const productSuggestions = await Product.find({
      isActive: true,
      $or: [
        { name: regex },
        { brand: regex }
      ]
    })
      .distinct('name')
      .limit(5);

    const categorySuggestions = await Category.find({
      isActive: true,
      name: regex
    })
      .distinct('name')
      .limit(3);

    const brandSuggestions = await Product.find({
      isActive: true,
      brand: regex
    })
      .distinct('brand')
      .limit(3);

    res.status(200).json({
      success: true,
      suggestions: {
        products: productSuggestions,
        categories: categorySuggestions,
        brands: brandSuggestions
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getPopularSearches = async (req, res) => {
  try {
    const popularProducts = await Product.find({
      isActive: true,
      'ratings.count': { $gte: 5 }
    })
      .sort({ 'ratings.average': -1, 'ratings.count': -1 })
      .select('name')
      .limit(10);

    const popularBrands = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const popularCategories = await Category.find({
      isActive: true
    })
      .sort({ sortOrder: 1 })
      .select('name')
      .limit(8);

    res.status(200).json({
      success: true,
      popular: {
        products: popularProducts.map(p => p.name),
        brands: popularBrands.map(b => b._id),
        categories: popularCategories.map(c => c.name)
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
