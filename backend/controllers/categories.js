const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let query = { isActive: true };
    
    if (req.query.parent) {
      query.parent = req.query.parent === 'null' ? null : req.query.parent;
    }

    const total = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .populate('parent', 'name')
      .populate('children', 'name')
      .sort({ sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: categories.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      categories
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name')
      .populate('children', 'name');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);

    if (category.parent) {
      await Category.findByIdAndUpdate(
        category.parent,
        { $addToSet: { children: category._id } }
      );
    }

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (category.children && category.children.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories'
      });
    }

    if (category.parent) {
      await Category.findByIdAndUpdate(
        category.parent,
        { $pull: { children: category._id } }
      );
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCategoryTree = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('children', 'name slug')
      .sort({ sortOrder: 1, name: 1 });

    const buildTree = (categories, parentId = null) => {
      return categories
        .filter(cat => {
          if (parentId === null) {
            return !cat.parent;
          }
          return cat.parent && cat.parent.toString() === parentId;
        })
        .map(cat => ({
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          image: cat.image,
          children: buildTree(categories, cat._id.toString())
        }));
    };

    const tree = buildTree(categories);

    res.status(200).json({
      success: true,
      categories: tree
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
