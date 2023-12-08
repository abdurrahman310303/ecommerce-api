const PerformanceMetric = require('../models/PerformanceMetric');

const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage();
  const startCpu = process.cpuUsage();
  
  req.queryCount = 0;
  req.cacheHit = false;

  const originalSend = res.send;
  res.send = function(data) {
    const diff = process.hrtime(startTime);
    const responseTime = diff[0] * 1000 + diff[1] * 1e-6;
    
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(startCpu);

    const metricData = {
      endpoint: req.route ? req.route.path : req.path,
      method: req.method,
      responseTime: Math.round(responseTime * 100) / 100,
      statusCode: res.statusCode,
      memoryUsage: {
        heapUsed: endMemory.heapUsed,
        heapTotal: endMemory.heapTotal,
        external: endMemory.external,
        rss: endMemory.rss
      },
      cpuUsage: {
        user: endCpu.user,
        system: endCpu.system
      },
      userId: req.user ? req.user._id : null,
      queryCount: req.queryCount || 0,
      cacheHit: req.cacheHit || false
    };

    if (res.statusCode >= 400) {
      metricData.errorMessage = data.message || 'Unknown error';
    }

    PerformanceMetric.create(metricData).catch(err => {
      console.error('Error saving performance metric:', err);
    });

    originalSend.call(this, data);
  };

  next();
};

const getPerformanceStats = async (filters = {}) => {
  try {
    const {
      endpoint,
      method,
      startDate,
      endDate,
      statusCode,
      limit = 100
    } = filters;

    const matchFilter = {};
    
    if (endpoint) matchFilter.endpoint = endpoint;
    if (method) matchFilter.method = method;
    if (statusCode) matchFilter.statusCode = statusCode;
    
    if (startDate || endDate) {
      matchFilter.timestamp = {};
      if (startDate) matchFilter.timestamp.$gte = new Date(startDate);
      if (endDate) matchFilter.timestamp.$lte = new Date(endDate);
    }

    const stats = await PerformanceMetric.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method'
          },
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
          totalRequests: { $sum: 1 },
          errorCount: {
            $sum: {
              $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
            }
          },
          avgMemoryUsed: { $avg: '$memoryUsage.heapUsed' },
          avgQueryCount: { $avg: '$queryCount' },
          cacheHitRate: {
            $avg: {
              $cond: ['$cacheHit', 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          errorRate: {
            $multiply: [
              { $divide: ['$errorCount', '$totalRequests'] },
              100
            ]
          },
          cacheHitRate: {
            $multiply: ['$cacheHitRate', 100]
          }
        }
      },
      { $sort: { avgResponseTime: -1 } },
      { $limit: limit }
    ]);

    return stats;
  } catch (error) {
    throw error;
  }
};

const getSlowestEndpoints = async (limit = 10, days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const slowest = await PerformanceMetric.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          statusCode: { $lt: 400 }
        }
      },
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method'
          },
          avgResponseTime: { $avg: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
          requestCount: { $sum: 1 }
        }
      },
      {
        $match: {
          requestCount: { $gte: 5 }
        }
      },
      { $sort: { avgResponseTime: -1 } },
      { $limit: limit }
    ]);

    return slowest;
  } catch (error) {
    throw error;
  }
};

const getErrorAnalysis = async (days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const errorAnalysis = await PerformanceMetric.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          statusCode: { $gte: 400 }
        }
      },
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method',
            statusCode: '$statusCode'
          },
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          commonErrors: { $addToSet: '$errorMessage' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const statusCodeBreakdown = await PerformanceMetric.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$statusCode',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      errorDetails: errorAnalysis,
      statusCodeBreakdown
    };
  } catch (error) {
    throw error;
  }
};

const getSystemHealthMetrics = async (hours = 24) => {
  try {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const healthMetrics = await PerformanceMetric.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          avgResponseTime: { $avg: '$responseTime' },
          avgMemoryUsage: { $avg: '$memoryUsage.heapUsed' },
          avgCpuUser: { $avg: '$cpuUsage.user' },
          totalRequests: { $sum: 1 },
          errorCount: {
            $sum: {
              $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          errorRate: {
            $multiply: [
              { $divide: ['$errorCount', '$totalRequests'] },
              100
            ]
          },
          timestamp: {
            $dateFromString: {
              dateString: {
                $concat: ['$_id.date', 'T', { $toString: '$_id.hour' }, ':00:00Z']
              }
            }
          }
        }
      },
      { $sort: { timestamp: 1 } }
    ]);

    return healthMetrics;
  } catch (error) {
    throw error;
  }
};

const cleanupOldMetrics = async (daysToKeep = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await PerformanceMetric.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    console.log(`Cleaned up ${result.deletedCount} old performance metrics`);
    return result;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  performanceMonitor,
  getPerformanceStats,
  getSlowestEndpoints,
  getErrorAnalysis,
  getSystemHealthMetrics,
  cleanupOldMetrics
};
