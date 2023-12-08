const mongoose = require('mongoose');

const performanceMetricSchema = mongoose.Schema({
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  responseTime: {
    type: Number,
    required: true
  },
  statusCode: {
    type: Number,
    required: true
  },
  memoryUsage: {
    heapUsed: Number,
    heapTotal: Number,
    external: Number,
    rss: Number
  },
  cpuUsage: {
    user: Number,
    system: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  errorMessage: String,
  queryCount: {
    type: Number,
    default: 0
  },
  cacheHit: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

performanceMetricSchema.index({ endpoint: 1, timestamp: -1 });
performanceMetricSchema.index({ method: 1, timestamp: -1 });
performanceMetricSchema.index({ statusCode: 1 });
performanceMetricSchema.index({ timestamp: -1 });

module.exports = mongoose.model('PerformanceMetric', performanceMetricSchema);
