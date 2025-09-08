const { ActivityLog, User } = require('../../../models');
const { Op } = require('sequelize');

const activityController = {
  async getActivityLogs(req, res) {
    try {
      const { startDate, endDate, type, page = 1, limit = 50 } = req.query;
      
      const whereClause = {};
      
      // Date filtering
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate);
        }
      }
      
      // Type filtering
      if (type && type !== 'all') {
        whereClause.action = {
          [Op.iLike]: `%${type}%`
        };
      }
      
      const offset = (page - 1) * limit;
      
      const { rows: activities, count } = await ActivityLog.findAndCountAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // Transform the data to match frontend expectations
      const transformedActivities = activities.map(activity => ({
        id: activity.id,
        userId: activity.userId,
        user: activity.user,
        action: activity.action,
        details: activity.details || {},
        ipAddress: activity.ipAddress || 'N/A',
        userAgent: activity.userAgent || 'N/A',
        status: activity.status || 'info',
        createdAt: activity.createdAt
      }));
      
      res.status(200).json({
        success: true,
        data: {
          activities: transformedActivities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity logs',
        error: error.message
      });
    }
  },

  async createActivityLog(req, res) {
    try {
      const { action, details, status = 'info' } = req.body;
      const userId = req.user.id;
      
      // Get request metadata
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      const activityLog = await ActivityLog.create({
        action,
        userId,
        details,
        ipAddress,
        userAgent,
        status
      });
      
      res.status(201).json({
        success: true,
        data: activityLog,
        message: 'Activity logged successfully'
      });
    } catch (error) {
      console.error('Error creating activity log:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create activity log',
        error: error.message
      });
    }
  }
};

module.exports = activityController;
