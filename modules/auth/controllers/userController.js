const { User, LoginHistory, ActiveSession } = require('../../../models');
const { ActivityLog } = require('../../../models'); // Keep using main models for now until system module is created
const sequelize = require('../../../models').sequelize;
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

exports.register = async (req, res) => {
  try {
    console.log('\n📝 New user registration request received...'.yellow);
    console.log('⏳ Validating user input...................'.cyan);

    const { email, phoneNumber } = req.body;

    // Check for existing user
    console.log('⏳ Checking for existing user..............'.cyan);
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { phoneNumber }]
      }
    });

    if (existingUser) {
      console.log('❌ User already exists....................'.red);
      return res.status(400).json({
        status: 'error',
        message: '❌ User with this email or phone number already exists'
      });
    }

    console.log('⏳ Creating new user......................'.cyan);
    const user = await User.create({
      ...req.body,
      forcePasswordChange: true, // Force new users to change password on first login
      twoFactorEnabled: true, // Enable 2FA by default for all new users
      twoFactorMethod: 'email', // Default to email-based 2FA
      passwordExpiresAt: new Date(), // Force immediate password change
      lastPasswordChangedAt: new Date(Date.now() - 86400000) // Set to yesterday
    });
    
    // Log user registration
    await ActivityLog.create({
      userId: user.id, // The new user's ID
      action: 'user_registered',
      status: 'success',
      details: { 
        email: user.email,
        role: user.role 
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    console.log('✅ User created successfully..............'.green);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(201).json({
      status: 'success',
      message: '✅ User account created successfully',
      data: { user }
    });
  } catch (error) {
    console.error('❌ Registration error:'.red, error.message);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('\n🔐 Login request received.................'.yellow);
    console.log('⏳ Validating credentials.................'.cyan);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing credentials...................'.red);
      return res.status(400).json({
        status: 'error',
        message: '📝 Please provide both email and password'
      });
    }

    console.log('⏳ Checking user credentials..............'.cyan);
    const user = await User.findOne({ 
      where: { email },
      include: [
        {
          model: require('../../../models').Branch,
          as: 'branch',
          attributes: ['id', 'name', 'displayName', 'branchCode', 'region', 'branchType', 'status', 'isActive', 'isHeadOffice']
        }
      ]
    });

    // Check if account is permanently locked
    if (user && user.isLocked) {
      console.log('🔒 Account is permanently locked..........'.red);
      return res.status(401).json({
        status: 'error',
        message: '🔒 Account is locked. Please contact an administrator to unlock your account.',
        permanentlyLocked: true
      });
    }

    // Incorrect credentials handling with immediate 3-attempt lockout
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log('❌ Invalid credentials...................'.red);
      
      if (user) {
        console.log('🔐 Login debug - Email:', user.email);
        console.log('🔐 Login debug - Password provided:', JSON.stringify(password));
        console.log('🔐 Login debug - Password length provided:', password.length);
        console.log('🔐 Login debug - Stored password hash:', user.password.substring(0, 20) + '...');
        console.log('🔐 Login debug - Full stored password hash:', user.password);
        console.log('🔐 Login debug - Password comparison result:', await bcrypt.compare(password, user.password));
        
        // Test by re-fetching user from database
        const freshUser = await User.findOne({ where: { email: user.email } });
        console.log('🔐 Login debug - Fresh user password hash:', freshUser.password.substring(0, 20) + '...');
        console.log('🔐 Login debug - Fresh user comparison:', await bcrypt.compare(password, freshUser.password));
        console.log('🔐 Login debug - Passwords match?', user.password === freshUser.password);
        
        // Manual bcrypt test with the exact hash
        const storedHash = '$2a$12$tplAE36nt6yF2uQyWhFHL.Oxpk9D2V.dq/VP06OODhbiMtVLU4hcC';
        const testResult = await bcrypt.compare(password, storedHash);
        console.log('🔐 Login debug - Manual hash test:', testResult);
        
        // Test creating a new hash with the same password
        const newHash = await bcrypt.hash(password, 12);
        console.log('🔐 Login debug - New hash created:', newHash.substring(0, 20) + '...');
        const newHashTest = await bcrypt.compare(password, newHash);
        console.log('🔐 Login debug - New hash test:', newHashTest);
        
        const failedAttempts = user.failedLoginAttempts + 1;
        const updates = { failedLoginAttempts: failedAttempts };
        
        // Immediate lockout after 3 failed attempts
        if (failedAttempts >= 3) {
          updates.lockoutUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Lock for 1 year (effectively permanent)
          updates.lockReason = `Account locked after ${failedAttempts} failed login attempts`;
          updates.lockedBy = 'system';
          
          console.log('🔒 Account locked immediately after 3 attempts'.red);
          
          await user.update(updates);
          
          return res.status(401).json({
            status: 'error',
            message: '🔒 Account has been locked due to 3 failed login attempts. Please contact an administrator to unlock your account.',
            permanentlyLocked: true,
            lockoutUntil: updates.lockoutUntil
          });
        }
        
        await user.update(updates);
        
        const attemptsRemaining = 3 - failedAttempts;
        console.log(`⚠️ ${attemptsRemaining} attempts remaining for user ${user.email}`.yellow);
        
        return res.status(401).json({
          status: 'error',
          message: `❌ Incorrect email or password. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before account lockout.`,
          attemptsRemaining: attemptsRemaining
        });
      }
      
      return res.status(401).json({
        status: 'error',
        message: '❌ Incorrect email or password'
      });
    }

    console.log('⏳ Generating access token................'.cyan);
    
    // Update login history
    await user.update({
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null
    });

    // Reload user to ensure we have fresh data and virtual properties
    const freshUser = await User.findByPk(user.id, {
      include: [
        {
          model: require('../../../models').Branch,
          as: 'branch',
          attributes: ['id', 'name', 'displayName', 'branchCode', 'region', 'branchType', 'status', 'isActive', 'isHeadOffice']
        }
      ]
    });
    
    // Debug logging for password change flags
    console.log(`⏳ Checking password change requirements for user ${freshUser.id}:`.cyan);
    console.log(`   forcePasswordChange flag: ${freshUser.forcePasswordChange}`.cyan);
    console.log(`   lastPasswordChangedAt: ${freshUser.lastPasswordChangedAt}`.cyan);
    console.log(`   passwordExpiresAt: ${freshUser.passwordExpiresAt}`.cyan);
    console.log(`   virtual mustChangePassword: ${freshUser.mustChangePassword}`.cyan);
    
    // Check BOTH the direct flag AND the virtual property
    const passwordChangeRequired = freshUser.forcePasswordChange || freshUser.mustChangePassword;

    // Check if 2FA is enabled for the user
    if (freshUser.twoFactorEnabled) {
      console.log('🔐 2FA is enabled for user:', freshUser.id);
      
      // Import OTP service for 2FA
      const otpService = require('../services/otpService');
      
      try {
        // Generate and send OTP
        await otpService.generateAndSendOTP(freshUser);
        console.log(`✅ OTP sent to ${freshUser.email}`);
        
        // Return response indicating 2FA is required
        return res.status(200).json({
          status: 'requires_2fa',
          message: 'Two-factor authentication required. Please check your email for the verification code.',
          userId: freshUser.id,
          twoFactorMethod: freshUser.twoFactorMethod || 'email',
          expiresIn: 10, // 10 minutes
          user: {
            id: freshUser.id,
            email: freshUser.email,
            firstName: freshUser.firstName,
            lastName: freshUser.lastName,
            passwordChangeRequired: passwordChangeRequired,
            branchId: freshUser.branchId,
            branch: freshUser.branch
          }
        });
      } catch (otpError) {
        console.error('❌ Failed to send OTP:', otpError);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to send verification code. Please try again.'
        });
      }
    }

    // Create token with user info
    const token = jwt.sign(
      { 
        id: user.id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '30m', // Short expiration for banking security
        issuer: 'AWIB SACCOS Management System',
        subject: user.id.toString()
      }
    );

    // Get user basic info without sensitive data
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      passwordChangeRequired,
      lastPasswordChangedAt: user.lastPasswordChangedAt,
      passwordExpiresAt: user.passwordExpiresAt,
      profilePicture: user.profilePicture,
      branchId: user.branchId,
      branch: user.branch
    };

    // Record login attempt
    try {
      await LoginHistory.create({
        userId: user.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || 'Unknown',
        status: 'success'
      });
    } catch (historyError) {
      console.error('⚠️ Failed to record login history:', historyError.message);
      // Continue with login even if history recording fails
    }

    // Create active session record
    try {
      console.log('🔗 Creating active session for user:', user.id);
      
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
      
      console.log('✅ Active session created:', newSession.id);
    } catch (sessionError) {
      console.error('❌ Failed to create session record:', sessionError.message);
      console.error('❌ Session error details:', sessionError);
      // Continue with login even if session recording fails
    }

    // Set token as HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only set secure in prod
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });

    console.log('✅ Login successful......................'.green);
    res.status(200).json({
      status: 'success',
      message: '✅ Login successful! Welcome back!',
      token,
      user: userData
    });
  } catch (error) {
    console.error('❌ Login error:'.red, error.message);
    res.status(500).json({
      status: 'error',
      message: '🔥 Internal server error during login'
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.correctPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Check if password was previously used
    const isPasswordReused = await user.isPasswordPreviouslyUsed(newPassword);
    if (isPasswordReused) {
      return res.status(400).json({
        status: 'error',
        message: 'This password has been used recently. Please choose a different password.'
      });
    }

    // Update password and reset password change flags
    const now = new Date();
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(now.getDate() + 90); // Password expires in 90 days
    
    await user.update({ 
      password: newPassword,
      lastPasswordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      forcePasswordChange: false
    });
    
    console.log('Password changed successfully for user:', user.id);
    console.log('Updated password dates:', {
      lastPasswordChangedAt: now,
      passwordExpiresAt: passwordExpiresAt,
      forcePasswordChange: false
    });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

exports.logout = async (req, res) => {
  try {
    console.log('\n👋 Logout request received...............'.yellow);
    
    // Get user from protect middleware
    const userId = req.user.id;
    
    // Update last login history entry with logout time
    try {
      await LoginHistory.update(
        { loggedOutAt: new Date() },
        { 
          where: { 
            userId,
            loggedOutAt: null 
          },
          order: [['createdAt', 'DESC']],
          limit: 1
        }
      );
    } catch (historyError) {
      console.error('⚠️ Failed to update login history:', historyError.message);
      // Continue with logout even if history update fails
    }

    // Mark active session as inactive
    try {
      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
      if (token) {
        await ActiveSession.update(
          { 
            isActive: false,
            lastActivity: new Date()
          },
          { 
            where: { 
              userId,
              sessionToken: token,
              isActive: true
            }
          }
        );
      }
    } catch (sessionError) {
      console.error('⚠️ Failed to update session:', sessionError.message);
      // Continue with logout even if session update fails
    }

    // Log logout activity
    await ActivityLog.create({
      userId: req.user.id,
      action: 'logout',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Clear the auth_token cookie on logout
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    console.log('✅ Logout successful....................'.green);
    res.status(200).json({
      status: 'success',
      message: '👋 Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:'.red, error.message);
    res.status(500).json({
      status: 'error',
      message: '🔥 Internal server error during logout'
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an email address'
      });
    }
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with that email address'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    await user.update({
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    // In production, send email with reset token
    // For now, just return token in response
    res.status(200).json({
      status: 'success',
      message: 'Password reset token generated',
      resetToken // In production, remove this
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error processing forgot password request'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide token and new password'
      });
    }
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [Op.gt]: Date.now() }
      }
    });
    
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    await user.update({
      password: hashedPassword,
      lastPasswordChangedAt: new Date(),
      passwordResetToken: null,
      passwordResetExpires: null
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error resetting password'
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Remove sensitive data
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      department: user.department,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.status(200).json({
      status: 'success',
      data: { user: userData }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Fields that are allowed to be updated by user
    const allowedFields = ['firstName', 'lastName', 'phoneNumber'];
    const updateData = {};
    
    // Filter only allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }
    
    await User.update(updateData, {
      where: { id: req.user.id }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user profile'
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users'
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user'
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Admin can update more fields
    const allowedFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'role', 'department', 'status'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }
    
    await user.update(updateData);
    
    // Log user update
    await ActivityLog.create({
      userId: req.user.id,
      action: 'user_updated',
      status: 'success',
      details: { 
        updatedUserId: user.id,
        changes: updateData 
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { 
        user: {
          ...user.toJSON(),
          password: undefined,
          passwordResetToken: undefined,
          passwordResetExpires: undefined
        }
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user'
    });
  }
};

exports.deleteUser = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log(`Deleting user ID: ${userId}`);
    
    // Handle all related tables - we'll delete records in the right order
    // to avoid foreign key constraint issues
    
    // 1. Handle tables with notifications first
    try {
      const { Notification } = require('../../../models');
      if (Notification) {
        console.log('Deleting related Notification records...');
        await Notification.destroy({ where: { userId }, transaction: t });
      }
    } catch (error) {
      console.log('No Notification model or error:', error.message);
    }
    
    // 2. Handle security questions
    try {
      const { SecurityQuestion } = require('../../../models');
      if (SecurityQuestion) {
        console.log('Deleting related SecurityQuestion records...');
        await SecurityQuestion.destroy({ where: { userId }, transaction: t });
      }
    } catch (error) {
      console.log('No SecurityQuestion model or error:', error.message);
    }
    
    // 3. Handle leave requests
    try {
      const { Leave } = require('../../../models');
      if (Leave) {
        console.log('Deleting related Leave records...');
        await Leave.destroy({ where: { userId }, transaction: t });
      }
    } catch (error) {
      console.log('No Leave model or error:', error.message);
    }
    
    // 4. Handle expense requests
    try {
      const { ExpenseRequest } = require('../../../models');
      if (ExpenseRequest) {
        console.log('Deleting related ExpenseRequest records...');
        await ExpenseRequest.destroy({ where: { userId }, transaction: t });
      }
    } catch (error) {
      console.log('No ExpenseRequest model or error:', error.message);
    }
    
    // 5. Handle activity logs
    try {
      console.log('Deleting related ActivityLog records...');
      await ActivityLog.destroy({ where: { userId }, transaction: t });
    } catch (error) {
      console.log('Error deleting ActivityLog records:', error.message);
    }
    
    // 6. Handle login history
    try {
      console.log('Deleting related LoginHistory records...');
      await LoginHistory.destroy({ where: { userId }, transaction: t });
    } catch (error) {
      console.log('Error deleting LoginHistory records:', error.message);
    }
    
    // 7. Finally delete the user itself
    console.log('Deleting the user record...');
    await user.destroy({ transaction: t });
    
    // Commit the transaction
    await t.commit();
    console.log('Transaction committed successfully');
    
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    // Rollback transaction if there's an error
    await t.rollback();
    console.error('Delete user error:', error);
    
    // Send appropriate error based on the error type
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      const constraintTable = error.original?.table || 'unknown table';
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete user because of foreign key constraint with ${constraintTable}. Please contact an administrator.`,
        details: error.original?.detail || 'No details available'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user'
    });
  }
};

exports.getLockedAccounts = async (req, res) => {
  try {
    console.log('⏳ Fetching locked accounts...............'.cyan);
    
    const currentDate = new Date();
    
    const lockedAccounts = await User.findAll({
      where: {
        [Op.and]: [
          {
            failedLoginAttempts: {
              [Op.gte]: 5  // 5 or more failed attempts
            }
          },
          {
            lockoutUntil: {
              [Op.gt]: currentDate  // Lock time is in the future (still locked)
            }
          }
        ]
      },
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'failedLoginAttempts',
        'lockoutUntil',
        'status'
      ],
      order: [['lockoutUntil', 'DESC']]  // Most recently locked first
    });

    console.log(`✅ Found ${lockedAccounts.length} locked accounts`.green);
    
    // Transform dates to ISO strings for consistent formatting
    const formattedAccounts = lockedAccounts.map(account => ({
      ...account.toJSON(),
      lockoutUntil: account.lockoutUntil.toISOString()
    }));

    res.status(200).json({
      status: 'success',
      data: {
        lockedAccounts: formattedAccounts
      }
    });
  } catch (error) {
    console.error('❌ Error fetching locked accounts:'.red, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch locked accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.unlockAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    await user.update({
      failedLoginAttempts: 0,
      lockoutUntil: null
    });

    res.status(200).json({
      status: 'success',
      message: 'Account unlocked successfully'
    });
  } catch (error) {
    console.error('Error unlocking account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unlock account'
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    // Add direct flags for forcing password change and enabling 2FA
    const userData = {
      ...req.body,
      // Direct flag that will be checked in authController.login
      forcePasswordChange: true,
      // Enable 2FA by default for all new users
      twoFactorEnabled: true,
      twoFactorMethod: 'email',
      // Set password expiration to NOW to force password change
      passwordExpiresAt: new Date(),
      // Set the last password change to yesterday
      lastPasswordChangedAt: new Date(Date.now() - 86400000)
    };
    
    const newUser = await User.create(userData);
    const creator = await User.findByPk(req.user.id);

    // Log user creation with correct actor details
    await ActivityLog.create({
      userId: creator.id, // ID of the user performing the action
      action: 'USER_CREATED',
      status: 'success',
      details: { 
        actor: {
          id: creator.id,
          fullName: `${creator.firstName} ${creator.lastName}`,
          email: creator.email,
          role: creator.role
        },
        createdUser: {
          id: newUser.id,
          fullName: `${newUser.firstName} ${newUser.lastName}`,
          email: newUser.email,
          role: newUser.role
        }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ 
      status: 'success', 
      data: { user: newUser } 
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create user'
    });
  }
}; 
