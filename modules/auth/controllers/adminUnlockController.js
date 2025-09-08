const { User, AccountUnlockLog } = require('../../../models');
const emailService = require('../../../core/services/emailService');
const smsService = require('../../../core/services/simpleSmsService');
const crypto = require('crypto');

/**
 * Get all locked accounts
 */
exports.getLockedAccounts = async (req, res) => {
  try {
    const lockedUsers = await User.findAll({
      where: {
        lockoutUntil: {
          [require('sequelize').Op.gt]: new Date()
        }
      },
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'department', 'role',
        'lockoutUntil', 'failedLoginAttempts', 'lockReason', 'lockedBy',
        'unlockRequested', 'unlockRequestedAt', 'createdAt'
      ],
      order: [['lockoutUntil', 'DESC']]
    });

    const lockedAccountsWithDetails = lockedUsers.map(user => ({
      ...user.toJSON(),
      lockDuration: Math.ceil((new Date(user.lockoutUntil) - new Date()) / (1000 * 60)), // minutes
      isUnlockPending: user.unlockRequested
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        lockedAccounts: lockedAccountsWithDetails,
        total: lockedUsers.length
      }
    });
  } catch (error) {
    console.error('Get locked accounts error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch locked accounts'
    });
  }
};

/**
 * Admin initiates account unlock - sends OTP to user
 */
exports.initiateAccountUnlock = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // Validate inputs
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Unlock reason must be at least 10 characters long'
      });
    }

    // Find the locked user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user is actually locked
    if (!user.isLocked) {
      return res.status(400).json({
        status: 'error',
        message: 'User account is not locked'
      });
    }

    // Check admin permissions
    const admin = await User.findByPk(adminId);
    if (!admin || !['admin', 'super_admin'].includes(admin.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to unlock accounts'
      });
    }

    // For privileged users, only super_admin can unlock
    if (['admin', 'manager', 'accountant'].includes(user.role) && admin.role !== 'super_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only Super Admin can unlock privileged user accounts'
      });
    }

    // Generate unlock token and OTP
    const unlockToken = user.createUnlockToken();
    const unlockOtp = user.generateUnlockOTP();
    
    // Mark unlock as requested
    user.unlockRequested = true;
    user.unlockRequestedAt = new Date();
    
    await user.save();

    // Create unlock log
    await AccountUnlockLog.create({
      userId: user.id,
      adminId: admin.id,
      action: 'unlock_initiated',
      reason: reason.trim(),
      unlockToken: crypto.createHash('sha256').update(unlockToken).digest('hex'),
      unlockTokenExpires: user.unlockTokenExpires,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'pending'
    });

    // Log admin activity
    // await ActivityLog.create({
    //   userId: adminId,
    //   action: 'ACCOUNT_UNLOCK_INITIATED',
    //   status: 'success',
    //   details: {
    //     targetUserId: user.id,
    //     targetUserEmail: user.email,
    //     reason: reason.trim(),
    //     timestamp: new Date().toISOString()
    //   },
    //   ipAddress: req.ip,
    //   userAgent: req.headers['user-agent']
    // });

    // Send unlock OTP to both email and SMS
    try {
      console.log(`📤 Sending unlock OTP to ${user.email} via email and SMS...`);
      
      // Send email OTP
      const emailPromise = emailService.sendUnlockOTP(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        otp: unlockOtp,
        adminName: `${admin.firstName} ${admin.lastName}`,
        reason: reason.trim(),
        unlockToken: unlockToken
      });

      // Send SMS OTP if phone number exists
      const smsPromise = user.phoneNumber ? 
        smsService.sendUnlockOTP(user.phoneNumber, unlockOtp, {
          firstName: user.firstName,
          lastName: user.lastName
        }) : Promise.resolve(false);

      // Wait for both to complete
      const [emailSuccess, smsSuccess] = await Promise.all([emailPromise, smsPromise]);
      
      // Log results
      console.log(`📧 Email unlock OTP: ${emailSuccess ? 'Success' : 'Failed'}`);
      console.log(`📱 SMS unlock OTP: ${smsSuccess ? 'Success' : 'Skipped/Failed'}`);

      // Log OTP sent
      await AccountUnlockLog.create({
        userId: user.id,
        adminId: admin.id,
        action: 'otp_sent',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'pending',
        details: {
          emailSent: emailSuccess,
          smsSent: smsSuccess,
          hasPhoneNumber: !!user.phoneNumber
        }
      });

    } catch (emailError) {
      console.error('Failed to send unlock OTP:', emailError);
      // Don't fail the whole operation, but log the error
      // await ActivityLog.create({
      //   userId: adminId,
      //   action: 'UNLOCK_EMAIL_FAILED',
      //   status: 'failed',
      //   details: {
      //     targetUserId: user.id,
      //     error: emailError.message,
      //     timestamp: new Date().toISOString()
      //   },
      //   ipAddress: req.ip,
      //   userAgent: req.headers['user-agent']
      // });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Account unlock initiated. OTP has been sent to user\'s email.',
      data: {
        userId: user.id,
        userEmail: user.email,
        unlockToken: unlockToken, // Frontend needs this for the unlock URL
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
        otpExpiresIn: 10 * 60 // 10 minutes in seconds
      }
    });

  } catch (error) {
    console.error('Initiate account unlock error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to initiate account unlock'
    });
  }
};

/**
 * Get unlock logs for audit trail
 */
exports.getUnlockLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, adminId, action, status } = req.query;
    
    const whereClause = {};
    if (userId) whereClause.userId = userId;
    if (adminId) whereClause.adminId = adminId;
    if (action) whereClause.action = action;
    if (status) whereClause.status = status;

    const offset = (page - 1) * limit;

    const { count, rows: logs } = await AccountUnlockLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email', 'department', 'role']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['firstName', 'lastName', 'email', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get unlock logs error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch unlock logs'
    });
  }
};

/**
 * Get admin dashboard stats
 */
exports.getAdminStats = async (req, res) => {
  try {
    const [
      totalLockedAccounts,
      pendingUnlocks,
      todayUnlocks,
      failedUnlockAttempts
    ] = await Promise.all([
      User.count({
        where: {
          lockoutUntil: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      }),
      User.count({
        where: {
          unlockRequested: true,
          unlockTokenExpires: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      }),
      AccountUnlockLog.count({
        where: {
          action: 'unlock_completed',
          createdAt: {
            [require('sequelize').Op.gte]: new Date().setHours(0, 0, 0, 0)
          }
        }
      }),
      AccountUnlockLog.count({
        where: {
          status: 'failed',
          createdAt: {
            [require('sequelize').Op.gte]: new Date().setHours(0, 0, 0, 0)
          }
        }
      })
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        totalLockedAccounts,
        pendingUnlocks,
        todayUnlocks,
        failedUnlockAttempts
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch admin statistics'
    });
  }
};
