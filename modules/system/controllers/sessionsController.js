const { User, ActiveSession, ActivityLog } = require('../../../models');
const { Op } = require('sequelize');

const sessionsController = {
  /**
   * Get all active sessions with user details
   */
  async getActiveSessions(req, res) {
    try {
      const { page = 1, limit = 50, userId, role, search } = req.query;
      
      const whereClause = {
        isActive: true
      };

      // Build user filter
      const userWhereClause = {};
      
      if (userId) {
        userWhereClause.id = userId;
      }
      
      if (role && role !== 'all') {
        userWhereClause.role = role;
      }
      
      if (search) {
        userWhereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { rows: sessions, count } = await ActiveSession.findAndCountAll({
        where: whereClause,
        include: [{
          model: User,
          as: 'user',
          where: userWhereClause,
          attributes: [
            'id', 'firstName', 'lastName', 'email', 'role', 
            'department', 'lastLogin', 'status'
          ]
        }],
        order: [['lastActivity', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Transform the data to include additional info
      const transformedSessions = sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        user: {
          id: session.user.id,
          name: `${session.user.firstName} ${session.user.lastName}`,
          email: session.user.email,
          role: session.user.role,
          department: session.user.department,
          status: session.user.status
        },
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        duration: sessionsController.calculateSessionDuration(session.loginTime),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceInfo: session.deviceInfo,
        location: session.location,
        isCurrentSession: session.sessionToken === req.sessionToken
      }));

      res.status(200).json({
        success: true,
        data: {
          sessions: transformedSessions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          },
          summary: {
            totalActiveSessions: count,
            uniqueUsers: [...new Set(sessions.map(s => s.userId))].length
          }
        }
      });

    } catch (error) {
      console.error('Error fetching active sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active sessions',
        error: error.message
      });
    }
  },

  /**
   * Get session statistics and analytics
   */
  async getSessionStats(req, res) {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Current active sessions
      const activeSessions = await ActiveSession.count({
        where: { isActive: true }
      });

      // Sessions in last 24 hours
      const sessionsLast24h = await ActiveSession.count({
        where: {
          loginTime: {
            [Op.gte]: twentyFourHoursAgo
          }
        }
      });

      // Sessions in last week
      const sessionsLastWeek = await ActiveSession.count({
        where: {
          loginTime: {
            [Op.gte]: oneWeekAgo
          }
        }
      });

      // Unique users with active sessions
      const uniqueActiveUsers = await ActiveSession.count({
        where: { isActive: true },
        distinct: true,
        col: 'userId'
      });

      // Sessions by role
      const sessionsByRole = await ActiveSession.findAll({
        where: { isActive: true },
        include: [{
          model: User,
          as: 'user',
          attributes: ['role']
        }],
        attributes: [],
        group: ['user.role'],
        raw: true
      });

      // Recent login activity (last 24 hours)
      const recentActivity = await ActiveSession.findAll({
        where: {
          loginTime: {
            [Op.gte]: twentyFourHoursAgo
          }
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email', 'role']
        }],
        order: [['loginTime', 'DESC']],
        limit: 10
      });

      // Average session duration for completed sessions
      const completedSessions = await ActiveSession.findAll({
        where: {
          isActive: false,
          loginTime: {
            [Op.gte]: oneWeekAgo
          }
        },
        attributes: ['loginTime', 'lastActivity']
      });

      let averageSessionDuration = 0;
      if (completedSessions.length > 0) {
        const totalDuration = completedSessions.reduce((sum, session) => {
          const duration = new Date(session.lastActivity) - new Date(session.loginTime);
          return sum + duration;
        }, 0);
        averageSessionDuration = Math.round(totalDuration / completedSessions.length / 1000 / 60); // in minutes
      }

      res.status(200).json({
        success: true,
        data: {
          overview: {
            activeSessions,
            uniqueActiveUsers,
            sessionsLast24h,
            sessionsLastWeek,
            averageSessionDuration // in minutes
          },
          sessionsByRole: sessionsByRole.reduce((acc, item) => {
            acc[item['user.role']] = item.count || 0;
            return acc;
          }, {}),
          recentActivity: recentActivity.map(session => ({
            user: {
              name: `${session.user.firstName} ${session.user.lastName}`,
              email: session.user.email,
              role: session.user.role
            },
            loginTime: session.loginTime,
            ipAddress: session.ipAddress
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching session stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session statistics',
        error: error.message
      });
    }
  },

  /**
   * Get inactive users (users who haven't logged in recently)
   */
  async getInactiveUsers(req, res) {
    try {
      const { days = 30, page = 1, limit = 50, role, department } = req.query;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

      const whereClause = {
        [Op.or]: [
          { lastLogin: { [Op.lt]: cutoffDate } },
          { lastLogin: { [Op.is]: null } }
        ]
      };

      if (role && role !== 'all') {
        whereClause.role = role;
      }

      if (department && department !== 'all') {
        whereClause.department = department;
      }

      const offset = (page - 1) * limit;

      const { rows: inactiveUsers, count } = await User.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 'firstName', 'lastName', 'email', 'role', 
          'department', 'lastLogin', 'status', 'createdAt'
        ],
        order: [['lastLogin', 'DESC NULLS LAST']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Calculate days since last login
      const transformedUsers = inactiveUsers.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        lastLogin: user.lastLogin,
        daysSinceLastLogin: user.lastLogin 
          ? Math.floor((new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24))
          : 'Never',
        accountAge: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)),
        hasActiveSession: false // We'll update this below
      }));

      // Check for active sessions for these users
      const userIds = transformedUsers.map(user => user.id);
      const activeSessions = await ActiveSession.findAll({
        where: {
          userId: { [Op.in]: userIds },
          isActive: true
        },
        attributes: ['userId']
      });

      const usersWithActiveSessions = new Set(activeSessions.map(session => session.userId));
      transformedUsers.forEach(user => {
        user.hasActiveSession = usersWithActiveSessions.has(user.id);
      });

      res.status(200).json({
        success: true,
        data: {
          inactiveUsers: transformedUsers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          },
          summary: {
            totalInactiveUsers: count,
            cutoffDays: parseInt(days),
            usersNeverLoggedIn: transformedUsers.filter(u => u.daysSinceLastLogin === 'Never').length
          }
        }
      });

    } catch (error) {
      console.error('Error fetching inactive users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inactive users',
        error: error.message
      });
    }
  },

  /**
   * Terminate a specific session
   */
  async terminateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      const session = await ActiveSession.findByPk(sessionId, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        }]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (!session.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Session is already inactive'
        });
      }

      // Update session to inactive
      await session.update({
        isActive: false,
        lastActivity: new Date()
      });

      // Log the action
      await ActivityLog.create({
        action: 'SESSION_TERMINATED_BY_ADMIN',
        userId: session.userId,
        details: {
          sessionId: sessionId,
          terminatedBy: adminId,
          sessionDuration: sessionsController.calculateSessionDuration(session.loginTime),
          reason: reason || 'Administrative termination',
          userEmail: session.user.email,
          userName: `${session.user.firstName} ${session.user.lastName}`
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'warning'
      });

      res.status(200).json({
        success: true,
        message: 'Session terminated successfully',
        data: {
          terminatedSession: {
            id: session.id,
            user: session.user,
            loginTime: session.loginTime,
            duration: sessionsController.calculateSessionDuration(session.loginTime)
          }
        }
      });

    } catch (error) {
      console.error('Error terminating session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to terminate session',
        error: error.message
      });
    }
  },

  /**
   * Terminate all sessions for a specific user
   */
  async terminateUserSessions(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;

      const user = await User.findByPk(userId, {
        attributes: ['firstName', 'lastName', 'email', 'role']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get all active sessions for the user
      const activeSessions = await ActiveSession.findAll({
        where: {
          userId: userId,
          isActive: true
        }
      });

      if (activeSessions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active sessions found for this user'
        });
      }

      // Terminate all sessions
      await ActiveSession.update(
        {
          isActive: false,
          lastActivity: new Date()
        },
        {
          where: {
            userId: userId,
            isActive: true
          }
        }
      );

      // Log the action
      await ActivityLog.create({
        action: 'ALL_USER_SESSIONS_TERMINATED',
        userId: userId,
        details: {
          terminatedBy: adminId,
          sessionCount: activeSessions.length,
          reason: 'Administrative bulk termination'
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'warning'
      });

      res.status(200).json({
        success: true,
        message: `All ${activeSessions.length} active sessions terminated for user`,
        data: {
          user: {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role
          },
          terminatedSessionsCount: activeSessions.length
        }
      });

    } catch (error) {
      console.error('Error terminating user sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to terminate user sessions',
        error: error.message
      });
    }
  },

  /**
   * Debug endpoint to check raw session data
   */
  async debugSessions(req, res) {
    try {
      const allSessions = await ActiveSession.findAll({
        include: [{
          model: User,
          as: 'user',
          attributes: ['email', 'role', 'firstName', 'lastName']
        }],
        order: [['createdAt', 'DESC']]
      });

      const activeSessions = allSessions.filter(s => s.isActive);

      res.status(200).json({
        success: true,
        debug: true,
        data: {
          totalSessions: allSessions.length,
          activeSessions: activeSessions.length,
          sessions: allSessions.map(session => ({
            id: session.id,
            userId: session.userId,
            user: session.user ? {
              email: session.user.email,
              name: `${session.user.firstName} ${session.user.lastName}`,
              role: session.user.role
            } : null,
            isActive: session.isActive,
            loginTime: session.loginTime,
            lastActivity: session.lastActivity,
            ipAddress: session.ipAddress,
            createdAt: session.createdAt
          }))
        }
      });
    } catch (error) {
      console.error('Error in debug sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch debug session data',
        error: error.message
      });
    }
  },
  calculateSessionDuration(loginTime) {
    const now = new Date();
    const start = new Date(loginTime);
    const durationMs = now - start;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
};

module.exports = sessionsController;
