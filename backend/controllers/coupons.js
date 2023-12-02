const Coupon = require('../models/Coupon');
const Product = require('../models/Product');

exports.createCoupon = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;
    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      coupon
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('applicableProducts', 'name')
      .populate('applicableCategories', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: coupons.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      coupons
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('applicableProducts', 'name price')
      .populate('applicableCategories', 'name')
      .populate('usedBy.user', 'firstName lastName email');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      coupon
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      coupon
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
      .populate('applicableProducts')
      .populate('applicableCategories');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired or is not active'
      });
    }

    if (!coupon.isValidForUser(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon the maximum number of times'
      });
    }

    if (cartTotal < coupon.minimumAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of $${coupon.minimumAmount} required`
      });
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (cartTotal * coupon.value) / 100;
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else {
      discountAmount = coupon.value;
    }

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const { code, cartItems } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() })
      .populate('applicableProducts')
      .populate('applicableCategories');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired or is not active'
      });
    }

    if (!coupon.isValidForUser(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon the maximum number of times'
      });
    }

    let applicableTotal = 0;
    let totalCartValue = 0;

    for (const item of cartItems) {
      const product = await Product.findById(item.productId).populate('category');
      if (!product) continue;

      const itemTotal = product.price * item.quantity;
      totalCartValue += itemTotal;

      let isApplicable = true;

      if (coupon.applicableProducts.length > 0) {
        isApplicable = coupon.applicableProducts.some(
          p => p._id.toString() === product._id.toString()
        );
      }

      if (coupon.applicableCategories.length > 0) {
        isApplicable = isApplicable && coupon.applicableCategories.some(
          c => c._id.toString() === product.category._id.toString()
        );
      }

      if (coupon.excludedProducts.length > 0) {
        isApplicable = isApplicable && !coupon.excludedProducts.some(
          p => p.toString() === product._id.toString()
        );
      }

      if (isApplicable) {
        applicableTotal += itemTotal;
      }
    }

    if (totalCartValue < coupon.minimumAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of $${coupon.minimumAmount} required`
      });
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (applicableTotal * coupon.value) / 100;
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else {
      discountAmount = Math.min(coupon.value, applicableTotal);
    }

    coupon.usedCount += 1;
    coupon.usedBy.push({
      user: req.user.id,
      orderAmount: totalCartValue,
      discountAmount
    });

    await coupon.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      discount: {
        code: coupon.code,
        discountAmount,
        finalTotal: totalCartValue - discountAmount
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
