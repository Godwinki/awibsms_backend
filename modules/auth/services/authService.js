/**
 * Authentication Service
 * 
 * Handles authentication business logic, token generation,
 * password validation, and security checks.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const models = require('../../../models');
const User = models.User;
const LoginHistory = models.LoginHistory;

class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(email, password, ipAddress, userAgent) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Log failed attempt
      await this.logFailedLogin(null, email, 'User not found', ipAddress, userAgent);
      throw new Error('Invalid credentials');
    }
    
    // Check if account is locked
    if (user.isLocked) {
      await this.logFailedLogin(user.id, email, 'Account locked', ipAddress, userAgent);
      throw new Error(`Account is locked. Remaining time: ${user.remainingLockoutTime} minutes`);
    }
    
    // Verify password
    const isPasswordValid = await user.correctPassword(password);
    
    if (!isPasswordValid) {
      await this.handleFailedLogin(user, email, ipAddress, userAgent);
      throw new Error('Invalid credentials');
    }
    
    // Reset failed attempts on successful login
    await user.update({
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null
    });
    
    // Log successful login
    await this.logSuccessfulLogin(user, ipAddress, userAgent);
    
    return user;
  }
  
  /**
   * Generate JWT token for user
   */
  static generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        email: user.email 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '1d',
        issuer: 'AWIB SACCO Management System',
        subject: user.id.toString()
      }
    );
  }
  
  /**
   * Verify JWT token
   */
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        throw new Error('User no longer exists');
      }
      
      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  /**
   * Handle failed login attempts
   */
  static async handleFailedLogin(user, email, ipAddress, userAgent) {
    const failedAttempts = user.failedLoginAttempts + 1;
    const updates = { failedLoginAttempts: failedAttempts };
    
    // Lock account after multiple failed attempts
    if (failedAttempts >= 3) {
      updates.isLocked = true;
      updates.lockoutUntil = null; // Permanent lock
    }
    
    await user.update(updates);
    await this.logFailedLogin(user.id, email, 'Invalid password', ipAddress, userAgent);
  }
  
  /**
   * Log successful login
   */
  static async logSuccessfulLogin(user, ipAddress, userAgent) {
    await LoginHistory.create({
      userId: user.id,
      action: 'login',
      status: 'success',
      details: { 
        userInfo: {
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`,
          role: user.role
        },
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }
  
  /**
   * Log failed login attempt
   */
  static async logFailedLogin(userId, email, reason, ipAddress, userAgent) {
    await LoginHistory.create({
      userId,
      action: 'login',
      status: 'failed',
      details: { 
        attemptedEmail: email,
        reason,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent
    });
  }
  
  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(email) {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      throw new Error('No user found with that email address');
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    await user.update({
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    return resetToken;
  }
  
  /**
   * Reset password with token
   */
  static async resetPassword(token, newPassword) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [require('sequelize').Op.gt]: Date.now() }
      }
    });
    
    if (!user) {
      throw new Error('Token is invalid or has expired');
    }
    
    // Update password and clear reset token
    await user.update({
      password: newPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      forcePasswordChange: false
    });
    
    return user;
  }
  
  /**
   * Change user password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.correctPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Check if password was previously used
    const isPasswordReused = await user.isPasswordPreviouslyUsed(newPassword);
    if (isPasswordReused) {
      throw new Error('This password has been used recently. Please choose a different password.');
    }
    
    // Update password
    await user.update({ 
      password: newPassword,
      forcePasswordChange: false
    });
    
    return user;
  }
}

module.exports = AuthService;
