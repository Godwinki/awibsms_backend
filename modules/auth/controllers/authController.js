const { User, LoginHistory } = require('../../../models');
const { ActivityLog } = require('../../../models'); // Keep using main models for now until system module is created
const AuthService = require('../services/authService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// ... other imports ...

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Log failed login attempt for non-existent user
      // await ActivityLog.create({
      //   userId: null,
      //   action: 'login',
      //   status: 'failed',
      //   details: { 
      //     attemptedEmail: email,
      //     reason: 'User not found try a different user id' 
      //   },
      //   ipAddress: req.ip,
      //   userAgent: req.headers['user-agent']
      // });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if account is already locked
    const now = new Date();
    if (user.lockoutUntil && user.lockoutUntil > now) {
      const timeRemaining = Math.ceil((user.lockoutUntil - now) / (1000 * 60)); // minutes
      return res.status(423).json({
        status: 'error',
        message: `Account is temporarily locked. Please try again in ${timeRemaining} minutes.`,
        lockoutUntil: user.lockoutUntil,
        permanentlyLocked: false
      });
    }

    // Check if account is permanently locked (3+ failed attempts)
    if (user.failedLoginAttempts >= 3) {
      return res.status(423).json({
        status: 'error',
        message: 'Your account has been permanently locked due to multiple failed login attempts. Please contact an administrator to unlock your account.',
        permanentlyLocked: true,
        failedAttempts: user.failedLoginAttempts
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      // Reset failed attempts on successful login
      await user.update({
        failedLoginAttempts: 0,
        lockoutUntil: null
      });

      // Log successful password verification
      // await ActivityLog.create({
      //   userId: user.id,
      //   action: 'PASSWORD_VERIFIED',
      //   status: 'success',
      //   details: { 
      //     userInfo: {
      //       email: user.email,
      //       fullName: `${user.firstName} ${user.lastName}`,
      //       role: user.role
      //     },
      //     timestamp: new Date().toISOString()
      //   },
      //   ipAddress: req.ip,
      //   userAgent: req.headers['user-agent']
      // });

      console.log('Password verification logged:', user.id);

      // Reload user to ensure we have fresh data including virtual properties
      await user.reload();
      
      // Check if password change is required - explicitly check forcePasswordChange first
      const passwordChangeRequired = user.forcePasswordChange || user.mustChangePassword || false;
      
      console.log('=== PASSWORD CHANGE DEBUG ===');
      console.log('Backend - Raw forcePasswordChange value:', user.forcePasswordChange);
      console.log('Backend - Raw mustChangePassword value:', user.mustChangePassword);
      console.log('Backend - lastPasswordChangedAt:', user.lastPasswordChangedAt);
      console.log('Backend - passwordExpiresAt:', user.passwordExpiresAt);
      console.log('Backend - Final passwordChangeRequired:', passwordChangeRequired);
      console.log('=== END DEBUG ===');
      
      // Check if 2FA is enabled for the user
      if (user.twoFactorEnabled) {
        console.log('2FA is enabled for user:', user.id);
        
        // Generate and send OTP directly
        const otp = await this.generateAndSendOTP(user);
        
        // Return a response indicating 2FA is required
        return res.status(200).json({
          status: 'requires_2fa',
          message: 'Two-factor authentication required. Please check your email for the verification code.',
          userId: user.id,
          twoFactorMethod: user.twoFactorMethod || 'email',
          expiresIn: 10, // 10 minutes
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            passwordChangeRequired: passwordChangeRequired
          }
        });
      }
      
      // Get password expiry information
      const lastPasswordChangedAt = user.lastPasswordChangedAt || null;
      const passwordExpiresAt = user.passwordExpiresAt || null;
      
      // Debug password related info
      console.log('Backend - Force password change flag:', user.forcePasswordChange);
      console.log('Backend - User must change password (virtual):', user.mustChangePassword);
      console.log('Backend - Last password changed:', lastPasswordChangedAt);
      console.log('Backend - Password expires at:', passwordExpiresAt);
      console.log('Backend - Final password change required flag:', passwordChangeRequired);
      
      // Log full login success (2FA not required)
      await ActivityLog.create({
        userId: user.id,
        action: 'LOGIN',
        status: 'success',
        details: { 
          userInfo: {
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`,
            role: user.role
          },
          twoFactorUsed: false,
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Generate token and send response
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      console.log('Login activity logged successfully');
      console.log('Password change required:', passwordChangeRequired);

      res.status(200).json({
        status: 'success',
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
          profilePicture: user.profilePicture
        }
      });
    } else {
      // Increment failed login attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // Update user with new failed attempt count
      await user.update({
        failedLoginAttempts: newFailedAttempts
      });

      // Log failed login
      // await ActivityLog.create({
      //   userId: user.id,
      //   action: 'login',
      //   status: 'failed',
      //   details: { 
      //     userEmail: user.email,
      //     reason: 'Invalid password',
      //     attemptTime: new Date().toISOString(),
      //     failedAttempts: newFailedAttempts
      //   },
      //   ipAddress: req.ip,
      //   userAgent: req.headers['user-agent']
      // });

      // Check if account should be locked (3 attempts = immediate permanent lock)
      if (newFailedAttempts >= 3) {
        // Log account lock
        console.log(`Account locked permanently for user ${user.email} after ${newFailedAttempts} failed attempts`);
        
        return res.status(423).json({
          status: 'error',
          message: 'Your account has been permanently locked due to multiple failed login attempts. Please contact an administrator to unlock your account.',
          permanentlyLocked: true,
          failedAttempts: newFailedAttempts
        });
      }

      // Return error with remaining attempts
      const attemptsRemaining = 3 - newFailedAttempts;
      res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
        attemptsRemaining: attemptsRemaining,
        failedAttempts: newFailedAttempts
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Generate and send OTP directly
 */
exports.generateAndSendOTP = async (user) => {
  const crypto = require('crypto');
  
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP for storage
  const hashedOTP = crypto
    .createHmac('sha256', process.env.OTP_SECRET || 'otp-secret-key')
    .update(`${otp}.${user.id}`)
    .digest('hex');
  
  // Store OTP in user record
  await User.update({
    twoFactorSecret: hashedOTP,
    lastOtpTime: new Date(),
    otpAttempts: 0
  }, {
    where: { id: user.id }
  });
  
  // Send OTP via email
  try {
    await this.sendOTPEmail(user.email, otp, user);
    console.log(`✅ OTP sent to ${user.email}`);
    
    return otp;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    // For development, still log the OTP even if email fails
    console.log(`🔐 OTP for ${user.email}: ${otp} (expires in 10 minutes) [EMAIL FAILED]`);
    return otp;
  }
};

/**
 * Verify OTP and complete login
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    if (!userId || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and verification code are required'
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
    
    // Check if OTP exists and hasn't expired
    if (!user.twoFactorSecret || !user.lastOtpTime) {
      return res.status(400).json({
        status: 'error',
        message: 'No verification code found. Please request a new one.'
      });
    }
    
    // Check OTP expiry (10 minutes)
    const now = new Date();
    const otpTime = new Date(user.lastOtpTime);
    const diffMinutes = (now - otpTime) / (1000 * 60);
    
    if (diffMinutes > 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification code has expired. Please request a new one.'
      });
    }
    
    // Check max attempts
    if (user.otpAttempts >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many failed attempts. Please request a new verification code.'
      });
    }
    
    // Verify OTP
    const crypto = require('crypto');
    const hashedProvidedOTP = crypto
      .createHmac('sha256', process.env.OTP_SECRET || 'otp-secret-key')
      .update(`${otp}.${userId}`)
      .digest('hex');
    
    // Increment attempt counter
    await user.update({
      otpAttempts: user.otpAttempts + 1
    });
    
    if (user.twoFactorSecret !== hashedProvidedOTP) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }
    
    // OTP verified successfully - clear OTP data
    await user.update({
      twoFactorSecret: null,
      lastOtpTime: null,
      otpAttempts: 0
    });
    
    // Refresh user data to get the latest values including virtual properties
    await user.reload();
    
    // Check if password change is required
    const passwordChangeRequired = user.forcePasswordChange || user.mustChangePassword;
    
    // Get password expiry information
    const lastPasswordChangedAt = user.lastPasswordChangedAt || null;
    const passwordExpiresAt = user.passwordExpiresAt || null;
    
    // Debug password related info for 2FA flow
    console.log('Backend 2FA - Force password change flag:', user.forcePasswordChange);
    console.log('Backend 2FA - User must change password (virtual):', user.mustChangePassword);
    console.log('Backend 2FA - Final password change required flag:', passwordChangeRequired);
    
    // Create the user object that will be sent
    const userResponse = {
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
      profilePicture: user.profilePicture
    };
    
    console.log('Backend 2FA - Sending user response:', JSON.stringify(userResponse, null, 2));
    
    // Log successful login with 2FA
    await ActivityLog.create({
      userId: user.id,
      action: 'LOGIN_2FA',
      status: 'success',
      details: { 
        userInfo: {
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`,
          role: user.role
        },
        twoFactorUsed: true,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}; 
