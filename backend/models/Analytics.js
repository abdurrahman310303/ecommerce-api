const mongoose = require('mongoose');

const analyticsSchema = mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['page_view', 'product_view', 'add_to_cart', 'remove_from_cart', 'purchase', 'search', 'user_registration', 'user_login']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  userAgent: String,
  ipAddress: String,
  referrer: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ productId: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
