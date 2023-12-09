const mongoose = require('mongoose');

const backupLogSchema = mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['database', 'files', 'full_system']
  },
  status: {
    type: String,
    required: true,
    enum: ['started', 'in_progress', 'completed', 'failed'],
    default: 'started'
  },
  filePath: String,
  fileSize: Number,
  duration: Number,
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  errorMessage: String,
  metadata: {
    collections: [String],
    recordCount: Number,
    compressionRatio: Number,
    checksumHash: String
  },
  triggeredBy: {
    type: String,
    enum: ['manual', 'scheduled', 'system'],
    default: 'manual'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

backupLogSchema.index({ type: 1, status: 1 });
backupLogSchema.index({ startTime: -1 });

module.exports = mongoose.model('BackupLog', backupLogSchema);
