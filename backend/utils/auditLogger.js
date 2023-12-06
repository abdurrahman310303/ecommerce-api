const AuditLog = require('../models/AuditLog');

const logAudit = async (userId, action, resource, resourceId = null, details = {}, oldValues = null, newValues = null, req = null) => {
  try {
    const auditData = {
      userId,
      action,
      resource,
      resourceId,
      details,
      oldValues,
      newValues,
      ipAddress: req ? req.ip : null,
      userAgent: req ? req.get('User-Agent') : null
    };

    await AuditLog.create(auditData);
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

const logUserAction = async (userId, action, details = {}, req = null) => {
  await logAudit(userId, action, 'User', userId, details, null, null, req);
};

const logResourceChange = async (userId, action, resource, resourceId, oldValues = null, newValues = null, req = null) => {
  await logAudit(userId, action, resource, resourceId, {}, oldValues, newValues, req);
};

const logFailedAction = async (userId, action, resource, errorMessage, req = null) => {
  try {
    const auditData = {
      userId,
      action,
      resource,
      success: false,
      errorMessage,
      ipAddress: req ? req.ip : null,
      userAgent: req ? req.get('User-Agent') : null
    };

    await AuditLog.create(auditData);
  } catch (error) {
    console.error('Failed audit logging error:', error);
  }
};

const getAuditLogs = async (filters = {}) => {
  try {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      success,
      page = 1,
      limit = 50
    } = filters;

    const query = {};
    
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (success !== undefined) query.success = success;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalLogs = await AuditLog.countDocuments(query);
    const totalPages = Math.ceil(totalLogs / limit);

    return {
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalLogs,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    throw error;
  }
};

const getAuditStats = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            action: '$action',
            success: '$success'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.action',
          total: { $sum: '$count' },
          successful: {
            $sum: {
              $cond: [{ $eq: ['$_id.success', true] }, '$count', 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$_id.success', false] }, '$count', 0]
            }
          }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    const dailyActivity = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          totalActions: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    return {
      actionStats: stats,
      dailyActivity
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  logAudit,
  logUserAction,
  logResourceChange,
  logFailedAction,
  getAuditLogs,
  getAuditStats
};
