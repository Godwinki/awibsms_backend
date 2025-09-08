const { User, AccountUnlockLog } = require('../../../models');
const smsService = require('../../../core/services/simpleSmsService');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Verify unlock token and show unlock form
 */
exports.verifyUnlockToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Unlock token is required'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this unlock token
    const user = await User.findOne({
      where: {
        unlockToken: hashedToken,
        unlockTokenExpires: {
          [require('sequelize').Op.gt]: new Date()
        }
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'unlockRequested', 'unlockTokenExpires']
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired unlock token'
      });
    }

    if (!user.unlockRequested) {
      return res.status(400).json({
        status: 'error',
        message: 'Account unlock has not been initiated by an administrator'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Unlock token is valid',
      data: {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        expiresAt: user.unlockTokenExpires
      }
    });

  } catch (error) {
    console.error('Verify unlock token error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify unlock token'
    });
  }
};

/**
 * Verify OTP and proceed to password reset
 */
exports.verifyUnlockOTP = async (req, res) => {
  try {
    const { token } = req.params;
    const { otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid 6-digit OTP is required'
      });
    }

    // Hash the token to find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        unlockToken: hashedToken,
        unlockTokenExpires: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired unlock token'
      });
    }

    // Check OTP attempts
    if (user.unlockOtpAttempts >= 3) {
      // Log failed attempt due to too many tries
      await AccountUnlockLog.create({
        userId: user.id,
        adminId: null,
        action: 'unlock_failed',
        reason: 'Too many OTP attempts',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failed'
      });

      return res.status(429).json({
        status: 'error',
        message: 'Too many OTP attempts. Please contact administrator.'
      });
    }

    // Verify OTP
    const isValidOtp = user.verifyUnlockOTP(otp);

    if (!isValidOtp) {
      // Increment failed attempts
      user.unlockOtpAttempts += 1;
      await user.save();

      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP',
        attemptsRemaining: 3 - user.unlockOtpAttempts
      });
    }

    // OTP verified successfully - log the verification
    await AccountUnlockLog.create({
      userId: user.id,
      adminId: null,
      action: 'otp_verified',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'completed'
    });

    // Generate a temporary password reset token (valid for 15 minutes)
    const passwordResetToken = user.createPasswordResetToken();
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    return res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully. You can now reset your password.',
      data: {
        passwordResetToken,
        expiresIn: 15 * 60 // 15 minutes in seconds
      }
    });

  } catch (error) {
    console.error('Verify unlock OTP error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify OTP'
    });
  }
};

/**
 * Reset password and complete unlock process
 */
exports.resetPasswordAndUnlock = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Passwords do not match'
      });
    }

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by password reset token
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired password reset token'
      });
    }

    // Check if password was used before
    const isPasswordReused = await user.isPasswordPreviouslyUsed(password);
    if (isPasswordReused) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot reuse a previous password. Please choose a new password.'
      });
    }

    // Update password and clear all unlock/lock fields
    user.password = password;
    user.clearUnlockFields();
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.forcePasswordChange = false;

    await user.save();

    // Log successful unlock completion
    await AccountUnlockLog.create({
      userId: user.id,
      adminId: null,
      action: 'unlock_completed',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'completed'
    });

    // Log activity
    // await ActivityLog.create({
    //   userId: user.id,
    //   action: 'ACCOUNT_UNLOCKED',
    //   status: 'success',
    //   details: {
    //     method: 'admin_initiated_unlock',
    //     timestamp: new Date().toISOString()
    //   },
    //   ipAddress: req.ip,
    //   userAgent: req.headers['user-agent']
    // });

    return res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. Your account has been unlocked. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password and unlock error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to reset password and unlock account'
    });
  }
};

/**
 * Request new OTP if previous one expired
 */
exports.requestNewUnlockOTP = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        unlockToken: hashedToken,
        unlockTokenExpires: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired unlock token'
      });
    }

    // Generate new OTP
    const newOtp = user.generateUnlockOTP();
    await user.save();

    // Send new OTP to both email and SMS
    const emailService = require('../../../core/services/emailService');
    
    console.log(`📤 Sending new unlock OTP to ${user.email} via email and SMS...`);
    
    try {
      // Send email OTP
      const emailPromise = emailService.sendUnlockOTP(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        otp: newOtp,
        isResend: true
      });

      // Send SMS OTP if phone number exists
      const smsPromise = user.phoneNumber ? 
        smsService.sendUnlockOTP(user.phoneNumber, newOtp, {
          firstName: user.firstName,
          lastName: user.lastName
        }) : Promise.resolve(false);

      // Wait for both to complete
      const [emailSuccess, smsSuccess] = await Promise.all([emailPromise, smsPromise]);
      
      // Log results
      console.log(`📧 Email unlock OTP resend: ${emailSuccess ? 'Success' : 'Failed'}`);
      console.log(`📱 SMS unlock OTP resend: ${smsSuccess ? 'Success' : 'Skipped/Failed'}`);

      // Log new OTP request
      await AccountUnlockLog.create({
        userId: user.id,
        adminId: null,
        action: 'otp_sent',
        reason: 'Requested new OTP',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'pending',
        details: {
          emailSent: emailSuccess,
          smsSent: smsSuccess,
          hasPhoneNumber: !!user.phoneNumber,
          isResend: true
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'New OTP has been sent to your email and SMS',
        expiresIn: 10 * 60, // 10 minutes
        channels: {
          email: emailSuccess,
          sms: smsSuccess
        }
      });

    } catch (error) {
      console.error('Failed to send new unlock OTP:', error);
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send new OTP. Please try again.'
      });
    }

  } catch (error) {
    console.error('Request new unlock OTP error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send new OTP'
    });
  }
};

/**
 * Verify OTP directly with email (simplified flow)
 */
exports.verifyOTPDirect = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || otp.length !== 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid email and 6-digit OTP are required'
      });
    }

    // Hash the OTP to compare with stored hash
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Find user with this email and matching OTP
    const user = await User.findOne({
      where: {
        email: email.toLowerCase().trim(),
        unlockOtp: hashedOtp,
        unlockOtpExpires: {
          [require('sequelize').Op.gt]: new Date()
        },
        unlockRequested: true
      }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or verification code, or code has expired'
      });
    }

    // Check OTP attempts
    if (user.unlockOtpAttempts >= 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Too many failed attempts. Please request a new verification code.'
      });
    }

    // Find the admin who initiated the unlock request
    const unlockInitiatedLog = await AccountUnlockLog.findOne({
      where: {
        userId: user.id,
        action: 'unlock_initiated'
      },
      order: [['createdAt', 'DESC']] // Get the most recent one
    });

    const adminId = unlockInitiatedLog ? unlockInitiatedLog.adminId : null;

    // Mark OTP as used by clearing it
    await user.update({
      unlockOtp: null,
      unlockOtpExpires: null,
      unlockOtpAttempts: 0
    });

    // Log OTP verification with the admin who initiated the unlock
    await AccountUnlockLog.create({
      userId: user.id,
      adminId: adminId,
      action: 'otp_verified',
      reason: 'User verified OTP via direct method',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'completed'
    });

    return res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully',
      data: {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        adminId: adminId // Include admin ID for the password reset step
      }
    });

  } catch (error) {
    console.error('Verify OTP direct error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify OTP'
    });
  }
};

/**
 * Reset password directly with email (simplified flow)
 */
exports.resetPasswordDirect = async (req, res) => {
  try {
    const { email, password, adminId } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and new password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Find user who recently verified OTP (has unlock requested but no OTP)
    const user = await User.findOne({
      where: {
        email: email.toLowerCase().trim(),
        unlockRequested: true,
        unlockOtp: null // OTP was cleared after verification
      }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request or OTP not verified'
      });
    }

    // If adminId wasn't passed from frontend, try to find it from logs
    let resolvedAdminId = adminId;
    if (!resolvedAdminId) {
      const unlockInitiatedLog = await AccountUnlockLog.findOne({
        where: {
          userId: user.id,
          action: 'unlock_initiated'
        },
        order: [['createdAt', 'DESC']]
      });
      resolvedAdminId = unlockInitiatedLog ? unlockInitiatedLog.adminId : null;
    }

    // Don't hash password here - let the beforeSave hook handle it
    console.log('🔐 Password reset debug - Password provided:', JSON.stringify(password));
    console.log('🔐 Password reset debug - Password length:', password.length);
    console.log('🔐 Resetting password for user:', user.email);
    console.log('🔐 Letting beforeSave hook handle password hashing...');

    // Update user with new password and unlock account
    const updateResult = await user.update({
      password: password, // Plain password - beforeSave hook will hash it
      lastPasswordChangedAt: new Date(),
      forcePasswordChange: false,
      accountLocked: false,
      lockoutCount: 0,
      lockoutUntil: null, // Fixed typo: was lockedUntil, should be lockoutUntil
      failedLoginAttempts: 0, // Also reset failed login attempts
      // Clear unlock fields
      unlockRequested: false,
      unlockRequestedAt: null,
      unlockToken: null,
      unlockTokenExpires: null,
      unlockOtp: null,
      unlockOtpExpires: null,
      unlockOtpAttempts: 0
    });

    console.log('🔐 Password update result:', updateResult ? 'SUCCESS' : 'FAILED');
    
    // Reload user from database to verify the save
    await user.reload();
    console.log('🔐 Password after reload (hashed by hook):', user.password.substring(0, 20) + '...');
    
    // Verify the password works after database save
    const postSaveTest = await bcrypt.compare(password, user.password);
    console.log('🔐 Post-save password test (should be true):', postSaveTest);
    
    // If post-save test fails, there's still an issue
    if (!postSaveTest) {
      console.error('🔐 CRITICAL: Password verification failed after hook processing!');
      return res.status(500).json({
        status: 'error',
        message: 'Password update failed due to verification error'
      });
    }

    console.log('🔐 Account locked status:', user.accountLocked);
    console.log('🔐 Failed login attempts:', user.failedLoginAttempts);
    console.log('🔐 Lockout until:', user.lockoutUntil);

    // Log password reset and account unlock with proper admin ID
    await AccountUnlockLog.create({
      userId: user.id,
      adminId: resolvedAdminId,
      action: 'password_reset',
      reason: 'Account unlocked via direct OTP method',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'completed'
    });

    await AccountUnlockLog.create({
      userId: user.id,
      adminId: resolvedAdminId,
      action: 'unlock_completed',
      reason: 'Account successfully unlocked via direct method',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'completed'
    });

    return res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. Your account has been unlocked. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password direct error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to reset password and unlock account'
    });
  }
};
