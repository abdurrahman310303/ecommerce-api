const mongoose = require('mongoose');

const inventoryLogSchema = mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['stock_in', 'stock_out', 'sold', 'returned', 'adjustment'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: String,
  location: String,
  batchNumber: String,
  expirationDate: Date
}, {
  timestamps: true
});

inventoryLogSchema.index({ productId: 1, createdAt: -1 });
inventoryLogSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
