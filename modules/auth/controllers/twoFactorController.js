const { User, ActiveSession } = require('../../../models');
const { ActivityLog } = require('../../../models');
const otpService = require('../services/otpService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Request OTP for 2FA verification
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.requestOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate and send OTP
    await otpService.generateAndSendOTP(user);
    
    // Log OTP request
    await ActivityLog.create({
      userId: user.id,
      action: '2FA_OTP_REQUEST',
      status: 'success',
      details: { 
        email: user.email,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
      expiresIn: otpService.OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    console.error('OTP request error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send OTP'
    });
  }
};

/**
 * Verify OTP for 2FA
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    if (!userId || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and OTP are required'
      });
    }
    
    // Find user
    const user = await User.findByPk(userId, {
      include: [
        {
          model: require('../../../models').Branch,
          as: 'branch',
          attributes: ['id', 'name', 'displayName', 'branchCode', 'region', 'branchType', 'status', 'isActive', 'isHeadOffice']
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Verify OTP
    const isValid = await otpService.verifyOTP(userId, otp);
    
    if (!isValid) {
      // Log failed verification
      await ActivityLog.create({
        userId: user.id,
        action: '2FA_OTP_VERIFICATION',
        status: 'failed',
        details: { 
          email: user.email,
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired OTP'
      });
    }
    
    // Log successful verification
    await ActivityLog.create({
      userId: user.id,
      action: '2FA_OTP_VERIFICATION',
      status: 'success',
      details: { 
        email: user.email,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Check if password change is required
    const passwordChangeRequired = user.forcePasswordChange || user.mustChangePassword;
    
    // Get password expiry information
    const lastPasswordChangedAt = user.lastPasswordChangedAt || null;
    const passwordExpiresAt = user.passwordExpiresAt || null;
    
    // Debug password related info for 2FA flow
    console.log('TwoFactor 2FA - Force password change flag:', user.forcePasswordChange);
    console.log('TwoFactor 2FA - User must change password (virtual):', user.mustChangePassword);
    console.log('TwoFactor 2FA - Final password change required flag:', passwordChangeRequired);
    
    // Generate token for authentication
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Create active session record for 2FA completion
    try {
      console.log('🔗 Creating active session for 2FA user:', user.id);
      
      // First, mark any existing active sessions for this user as inactive
      const existingSessions = await ActiveSession.update(
        { isActive: false },
        { where: { userId: user.id, isActive: true } }
      );
      
      console.log('🔗 Marked', existingSessions[0], 'existing sessions as inactive');

      // Create new active session
      const newSession = await ActiveSession.create({
        userId: user.id,
        sessionToken: token,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'Unknown',
        loginTime: new Date(),
        lastActivity: new Date(),
        isActive: true,
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection.remoteAddress
        }
      });
      
      console.log('✅ Active session created for 2FA login:', newSession.id);
    } catch (sessionError) {
      console.error('❌ Failed to create session record for 2FA:', sessionError.message);
      console.error('❌ Session error details:', sessionError);
      // Continue with login even if session recording fails
    }

    // Set token as HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        status: user.status,
        passwordChangeRequired: passwordChangeRequired,
        forcePasswordChange: user.forcePasswordChange || false,
        lastPasswordChangedAt: lastPasswordChangedAt,
        passwordExpiresAt: passwordExpiresAt,
        profilePicture: user.profilePicture,
        branchId: user.branchId,
        branch: user.branch
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify OTP'
    });
  }
};

/**
 * Enable 2FA for a user
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.enable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { method = 'email' } = req.body;
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update user with 2FA enabled
    await user.update({
      twoFactorEnabled: true,
      twoFactorMethod: method
    });
    
    // Log 2FA enabled
    await ActivityLog.create({
      userId: user.id,
      action: '2FA_ENABLED',
      status: 'success',
      details: { 
        email: user.email,
        method,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication enabled successfully'
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to enable two-factor authentication'
    });
  }
};

/**
 * Disable 2FA for a user
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.disable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update user with 2FA disabled
    await user.update({
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorSecret: null,
      twoFactorBackupCodes: []
    });
    
    // Log 2FA disabled
    await ActivityLog.create({
      userId: user.id,
      action: '2FA_DISABLED',
      status: 'success',
      details: { 
        email: user.email,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to disable two-factor authentication'
    });
  }
};

/**
 * Generate backup codes for 2FA
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 */
exports.generateBackupCodes = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate 10 backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex');
      backupCodes.push(code);
    }
    
    // Store hashed backup codes
    const hashedBackupCodes = backupCodes.map(code => 
      crypto.createHash('sha256').update(code + user.id).digest('hex')
    );
    
    // Update user with backup codes
    await user.update({
      twoFactorBackupCodes: hashedBackupCodes
    });
    
    // Log backup codes generated
    await ActivityLog.create({
      userId: user.id,
      action: '2FA_BACKUP_CODES_GENERATED',
      status: 'success',
      details: { 
        email: user.email,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Backup codes generated successfully',
      backupCodes
    });
  } catch (error) {
    console.error('Generate backup codes error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate backup codes'
    });
  }
};
