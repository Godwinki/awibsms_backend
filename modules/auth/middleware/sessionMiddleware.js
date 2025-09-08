const { ActiveSession } = require('../../../models');

/**
 * Middleware to update session activity
 * This should be used after authentication middleware
 */
const updateSessionActivity = async (req, res, next) => {
  try {
    // Only update if user is authenticated
    if (req.user && req.user.id) {
      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
      
      if (token) {
        console.log('🔄 Updating session activity for user:', req.user.id);
        
        // Update last activity time for the session
        const updateResult = await ActiveSession.update(
          { lastActivity: new Date() },
          {
            where: {
              userId: req.user.id,
              sessionToken: token,
              isActive: true
            }
          }
        );
        
        console.log('🔄 Updated', updateResult[0], 'session records');
        
        // Store session token in request for later use
        req.sessionToken = token;
      }
    }
  } catch (error) {
    // Don't fail the request if session update fails
    console.error('⚠️ Failed to update session activity:', error.message);
  }
  
  next();
};

/**
 * Clean up expired sessions
 * This can be called periodically to remove old inactive sessions
 */
const cleanupExpiredSessions = async () => {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const expiredCount = await ActiveSession.destroy({
      where: {
        isActive: false,
        lastActivity: {
          [require('sequelize').Op.lt]: cutoffTime
        }
      }
    });
    
    if (expiredCount > 0) {
      console.log(`🧹 Cleaned up ${expiredCount} expired sessions`);
    }
    
    return expiredCount;
  } catch (error) {
    console.error('⚠️ Failed to cleanup expired sessions:', error.message);
    return 0;
  }
};

/**
 * Mark sessions as inactive after long periods of inactivity
 */
const markInactiveSessions = async () => {
  try {
    const inactivityThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
    
    const inactiveCount = await ActiveSession.update(
      { isActive: false },
      {
        where: {
          isActive: true,
          lastActivity: {
            [require('sequelize').Op.lt]: inactivityThreshold
          }
        }
      }
    );
    
    if (inactiveCount[0] > 0) {
      console.log(`⏰ Marked ${inactiveCount[0]} sessions as inactive due to inactivity`);
    }
    
    return inactiveCount[0];
  } catch (error) {
    console.error('⚠️ Failed to mark inactive sessions:', error.message);
    return 0;
  }
};

module.exports = {
  updateSessionActivity,
  cleanupExpiredSessions,
  markInactiveSessions
};
