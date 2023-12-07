const Discount = require('../models/Discount');

const calculateDiscount = async (cart, userId) => {
  try {
    const now = new Date();
    
    const activeDiscounts = await Discount.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { maxUsage: null },
        { usageCount: { $lt: '$maxUsage' } }
      ]
    })
    .populate('conditions.applicableProducts')
    .populate('conditions.applicableCategories')
    .sort({ priority: -1, value: -1 });

    let applicableDiscounts = [];
    
    for (const discount of activeDiscounts) {
      if (await isDiscountApplicable(discount, cart, userId)) {
        applicableDiscounts.push(discount);
      }
    }

    if (applicableDiscounts.length === 0) {
      return {
        appliedDiscounts: [],
        totalDiscount: 0,
        finalTotal: cart.totalPrice
      };
    }

    let bestDiscount = null;
    let maxDiscountAmount = 0;

    if (applicableDiscounts.some(d => d.stackable)) {
      let stackedDiscount = 0;
      let stackedDiscounts = [];
      
      for (const discount of applicableDiscounts.filter(d => d.stackable)) {
        const discountAmount = calculateDiscountAmount(discount, cart);
        stackedDiscount += discountAmount;
        stackedDiscounts.push({
          discount,
          amount: discountAmount
        });
      }
      
      if (stackedDiscount > maxDiscountAmount) {
        maxDiscountAmount = stackedDiscount;
        bestDiscount = {
          type: 'stacked',
          discounts: stackedDiscounts,
          totalAmount: stackedDiscount
        };
      }
    }

    for (const discount of applicableDiscounts) {
      const discountAmount = calculateDiscountAmount(discount, cart);
      if (discountAmount > maxDiscountAmount) {
        maxDiscountAmount = discountAmount;
        bestDiscount = {
          type: 'single',
          discount,
          amount: discountAmount
        };
      }
    }

    const finalTotal = Math.max(0, cart.totalPrice - maxDiscountAmount);

    return {
      appliedDiscounts: bestDiscount ? [bestDiscount] : [],
      totalDiscount: maxDiscountAmount,
      finalTotal
    };

  } catch (error) {
    throw error;
  }
};

const isDiscountApplicable = async (discount, cart, userId) => {
  const conditions = discount.conditions;

  if (conditions.minOrderAmount && cart.totalPrice < conditions.minOrderAmount) {
    return false;
  }

  if (conditions.maxOrderAmount && cart.totalPrice > conditions.maxOrderAmount) {
    return false;
  }

  if (conditions.applicableProducts.length > 0) {
    const applicableProductIds = conditions.applicableProducts.map(p => p._id.toString());
    const hasApplicableProduct = cart.items.some(item => 
      applicableProductIds.includes(item.product._id.toString())
    );
    if (!hasApplicableProduct) return false;
  }

  if (conditions.applicableCategories.length > 0) {
    const applicableCategoryIds = conditions.applicableCategories.map(c => c._id.toString());
    const hasApplicableCategory = cart.items.some(item => 
      applicableCategoryIds.includes(item.product.category._id.toString())
    );
    if (!hasApplicableCategory) return false;
  }

  if (conditions.firstTimeOnly) {
    const Order = require('../models/Order');
    const existingOrders = await Order.countDocuments({ userId });
    if (existingOrders > 0) return false;
  }

  if (conditions.maxUsagePerCustomer) {
    const Order = require('../models/Order');
    const customerUsage = await Order.countDocuments({
      userId,
      'appliedDiscounts.discountId': discount._id
    });
    if (customerUsage >= conditions.maxUsagePerCustomer) return false;
  }

  return true;
};

const calculateDiscountAmount = (discount, cart) => {
  switch (discount.type) {
    case 'percentage':
      return (cart.totalPrice * discount.value) / 100;
    
    case 'fixed_amount':
      return Math.min(discount.value, cart.totalPrice);
    
    case 'buy_x_get_y':
      let eligibleItems = cart.items;
      if (discount.conditions.applicableProducts.length > 0) {
        const applicableIds = discount.conditions.applicableProducts.map(p => p._id.toString());
        eligibleItems = cart.items.filter(item => 
          applicableIds.includes(item.product._id.toString())
        );
      }
      
      const totalEligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
      const freeItems = Math.floor(totalEligibleQuantity / discount.buyQuantity) * discount.getQuantity;
      
      const sortedItems = eligibleItems.sort((a, b) => a.product.price - b.product.price);
      let discountAmount = 0;
      let remainingFreeItems = freeItems;
      
      for (const item of sortedItems) {
        if (remainingFreeItems <= 0) break;
        const freeFromThisItem = Math.min(remainingFreeItems, item.quantity);
        discountAmount += freeFromThisItem * item.product.price;
        remainingFreeItems -= freeFromThisItem;
      }
      
      return discountAmount;
    
    case 'free_shipping':
      return cart.shippingCost || 0;
    
    default:
      return 0;
  }
};

const validateDiscount = (discountData) => {
  const errors = [];

  if (new Date(discountData.startDate) >= new Date(discountData.endDate)) {
    errors.push('End date must be after start date');
  }

  if (discountData.type === 'percentage' && (discountData.value <= 0 || discountData.value > 100)) {
    errors.push('Percentage discount must be between 1 and 100');
  }

  if (discountData.type === 'fixed_amount' && discountData.value <= 0) {
    errors.push('Fixed amount discount must be greater than 0');
  }

  if (discountData.type === 'buy_x_get_y') {
    if (!discountData.buyQuantity || discountData.buyQuantity <= 0) {
      errors.push('Buy quantity must be greater than 0');
    }
    if (!discountData.getQuantity || discountData.getQuantity <= 0) {
      errors.push('Get quantity must be greater than 0');
    }
  }

  return errors;
};

module.exports = {
  calculateDiscount,
  isDiscountApplicable,
  calculateDiscountAmount,
  validateDiscount
};
