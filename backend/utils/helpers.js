const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp.slice(-6)}${random}`;
};

const generateSKU = (productName, category) => {
  const nameCode = productName.substring(0, 3).toUpperCase();
  const categoryCode = category.substring(0, 2).toUpperCase();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${nameCode}${categoryCode}${random}`;
};

const calculateDiscountAmount = (total, coupon) => {
  let discount = 0;
  
  if (coupon.type === 'percentage') {
    discount = (total * coupon.value) / 100;
    if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
      discount = coupon.maximumDiscount;
    }
  } else if (coupon.type === 'fixed') {
    discount = Math.min(coupon.value, total);
  }
  
  return Math.round(discount * 100) / 100;
};

const calculateTax = (amount, taxRate = 0.08) => {
  return Math.round(amount * taxRate * 100) / 100;
};

const calculateShipping = (items, shippingRate = 5.99) => {
  const totalWeight = items.reduce((sum, item) => {
    return sum + (item.weight || 1) * item.quantity;
  }, 0);
  
  if (totalWeight > 10) {
    return shippingRate * 2;
  } else if (totalWeight > 5) {
    return shippingRate * 1.5;
  }
  
  return shippingRate;
};

const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const generateCouponCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

const sanitizeSearchQuery = (query) => {
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = {
  generateOrderNumber,
  generateSKU,
  calculateDiscountAmount,
  calculateTax,
  calculateShipping,
  formatCurrency,
  generateCouponCode,
  validateEmail,
  validatePhone,
  sanitizeSearchQuery,
  generateSlug
};
