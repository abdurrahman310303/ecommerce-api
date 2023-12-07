const mongoose = require('mongoose');

const discountSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping']
  },
  value: {
    type: Number,
    required: function() {
      return this.type === 'percentage' || this.type === 'fixed_amount';
    }
  },
  buyQuantity: {
    type: Number,
    required: function() {
      return this.type === 'buy_x_get_y';
    }
  },
  getQuantity: {
    type: Number,
    required: function() {
      return this.type === 'buy_x_get_y';
    }
  },
  conditions: {
    minOrderAmount: {
      type: Number,
      default: 0
    },
    maxOrderAmount: Number,
    applicableProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    applicableCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    customerSegments: [{
      type: String,
      enum: ['new_customer', 'returning_customer', 'vip_customer', 'bulk_buyer']
    }],
    firstTimeOnly: {
      type: Boolean,
      default: false
    },
    maxUsagePerCustomer: {
      type: Number,
      default: null
    }
  },
  stackable: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  maxUsage: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

discountSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
discountSchema.index({ type: 1 });
discountSchema.index({ 'conditions.applicableProducts': 1 });
discountSchema.index({ 'conditions.applicableCategories': 1 });

module.exports = mongoose.model('Discount', discountSchema);
