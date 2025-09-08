const { User, ActivityLog, AccountUnlockLog } = require('../../../models');

const superAdminUnlockController = {
  /**
   * Special endpoint for super admins to unlock other super admin accounts
   * This is a critical security feature for when super admin accounts get locked
   */
  async unlockSuperAdmin(req, res) {
    try {
      const { targetEmail, reason } = req.body;
      const requestingAdminId = req.user.id;

      // Validate input
      if (!targetEmail || !reason) {
        return res.status(400).json({
          status: 'error',
          message: 'Target email and reason are required'
        });
      }

      if (reason.trim().length < 10) {
        return res.status(400).json({
          status: 'error',
          message: 'Reason must be at least 10 characters long'
        });
      }

      // Get requesting admin details
      const requestingAdmin = await User.findByPk(requestingAdminId);
      if (!requestingAdmin || requestingAdmin.role !== 'super_admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Only super admins can unlock other super admin accounts'
        });
      }

      // Find target user
      const targetUser = await User.findOne({ where: { email: targetEmail } });
      if (!targetUser) {
        return res.status(404).json({
          status: 'error',
          message: 'Target user not found'
        });
      }

      // Verify target is a super admin
      if (targetUser.role !== 'super_admin') {
        return res.status(400).json({
          status: 'error',
          message: 'This endpoint is only for unlocking super admin accounts'
        });
      }

      // Prevent self-unlock (use regular unlock flow for that)
      if (targetUser.id === requestingAdminId) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot use this endpoint to unlock your own account. Use the regular unlock flow.'
        });
      }

      // Check if account is actually locked
      if (!targetUser.lockoutUntil) {
        return res.status(400).json({
          status: 'error',
          message: 'Target account is not currently locked'
        });
      }

      // Perform the unlock
      await targetUser.update({
        lockoutUntil: null,
        failedLoginAttempts: 0,
        forcePasswordChange: true, // Force password change for security
        twoFactorEnabled: true // Ensure 2FA is enabled
      });

      // Log the critical activity
      await ActivityLog.create({
        action: 'SUPER_ADMIN_UNLOCK_BY_SUPER_ADMIN',
        userId: targetUser.id,
        details: {
          unlockedBy: requestingAdmin.email,
          unlockedByUserId: requestingAdminId,
          reason: reason,
          targetEmail: targetEmail,
          timestamp: new Date(),
          securityLevel: 'CRITICAL'
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'warning'
      });

      // Create unlock log
      await AccountUnlockLog.create({
        userId: targetUser.id,
        adminId: requestingAdminId,
        reason: `SUPER ADMIN UNLOCK: ${reason}`,
        method: 'SUPER_ADMIN_UNLOCK',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      // Also log for the requesting admin
      await ActivityLog.create({
        action: 'PERFORMED_SUPER_ADMIN_UNLOCK',
        userId: requestingAdminId,
        details: {
          targetEmail: targetEmail,
          targetUserId: targetUser.id,
          reason: reason,
          timestamp: new Date(),
          securityLevel: 'CRITICAL'
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: 'warning'
      });

      res.status(200).json({
        status: 'success',
        message: 'Super admin account unlocked successfully',
        data: {
          unlockedUser: {
            email: targetUser.email,
            name: `${targetUser.firstName} ${targetUser.lastName}`
          },
          forcePasswordChange: true,
          twoFactorEnabled: true
        }
      });

    } catch (error) {
      console.error('Error in super admin unlock:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to unlock super admin account',
        error: error.message
      });
    }
  },

  /**
   * Get list of locked super admin accounts
   */
  async getLockedSuperAdmins(req, res) {
    try {
      const requestingAdminId = req.user.id;

      // Verify requesting user is super admin
      const requestingAdmin = await User.findByPk(requestingAdminId);
      if (!requestingAdmin || requestingAdmin.role !== 'super_admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Only super admins can view locked super admin accounts'
        });
      }

      // Get all locked super admin accounts (excluding self)
      const lockedSuperAdmins = await User.findAll({
        where: {
          role: 'super_admin',
          lockoutUntil: {
            [require('sequelize').Op.ne]: null
          },
          id: {
            [require('sequelize').Op.ne]: requestingAdminId
          }
        },
        attributes: [
          'id', 'email', 'firstName', 'lastName', 
          'lockoutUntil', 'failedLoginAttempts', 'lastLogin'
        ]
      });

      res.status(200).json({
        status: 'success',
        data: {
          lockedSuperAdmins: lockedSuperAdmins.map(admin => ({
            id: admin.id,
            email: admin.email,
            name: `${admin.firstName} ${admin.lastName}`,
            lockoutUntil: admin.lockoutUntil,
            failedLoginAttempts: admin.failedLoginAttempts,
            lastFailedLogin: admin.lastLogin
          })),
          count: lockedSuperAdmins.length
        }
      });

    } catch (error) {
      console.error('Error getting locked super admins:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get locked super admin accounts',
        error: error.message
      });
    }
  },

  /**
   * Check super admin security status
   */
  async checkSuperAdminSecurity(req, res) {
    try {
      const requestingAdminId = req.user.id;

      // Verify requesting user is super admin
      const requestingAdmin = await User.findByPk(requestingAdminId);
      if (!requestingAdmin || requestingAdmin.role !== 'super_admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Only super admins can check security status'
        });
      }

      // Get all super admin accounts
      const allSuperAdmins = await User.findAll({
        where: { role: 'super_admin' },
        attributes: [
          'id', 'email', 'firstName', 'lastName', 
          'lockoutUntil', 'status', 'failedLoginAttempts'
        ]
      });

      const totalSuperAdmins = allSuperAdmins.length;
      const activeSuperAdmins = allSuperAdmins.filter(admin => 
        admin.status === 'active' && !admin.lockoutUntil
      );
      const lockedSuperAdmins = allSuperAdmins.filter(admin => admin.lockoutUntil);
      const disabledSuperAdmins = allSuperAdmins.filter(admin => admin.status !== 'active');

      // Determine security level
      let securityLevel = 'GOOD';
      let warnings = [];

      if (totalSuperAdmins === 0) {
        securityLevel = 'CRITICAL';
        warnings.push('No super admin accounts exist');
      } else if (totalSuperAdmins === 1) {
        securityLevel = 'WARNING';
        warnings.push('Only one super admin account exists (single point of failure)');
      } else if (activeSuperAdmins.length === 0) {
        securityLevel = 'CRITICAL';
        warnings.push('All super admin accounts are locked or disabled');
      } else if (activeSuperAdmins.length === 1) {
        securityLevel = 'WARNING';
        warnings.push('Only one active super admin account available');
      }

      if (lockedSuperAdmins.length > 0) {
        warnings.push(`${lockedSuperAdmins.length} super admin account(s) are locked`);
      }

      res.status(200).json({
        status: 'success',
        data: {
          securityLevel,
          warnings,
          summary: {
            total: totalSuperAdmins,
            active: activeSuperAdmins.length,
            locked: lockedSuperAdmins.length,
            disabled: disabledSuperAdmins.length
          },
          recommendations: totalSuperAdmins < 2 ? [
            'Create at least 2 super admin accounts for redundancy',
            'Ensure multiple super admins have access to the system'
          ] : []
        }
      });

    } catch (error) {
      console.error('Error checking super admin security:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check super admin security status',
        error: error.message
      });
    }
  }
};

module.exports = superAdminUnlockController;
