'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('Admin@255', 12);
    const now = new Date();
    const threeMonthsFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    
    await queryInterface.bulkInsert('Users', [{
      id: uuidv4(),
      firstName: 'Godwin',
      lastName: 'Kiwovele',
      email: 'godwinkiwovel@gmail.com',
      password: hashedPassword,
      phoneNumber: '+255744958059',
      department: 'Administration',
      role: 'super_admin',
      status: 'active',
      failedLoginAttempts: 0,
      lastPasswordChangedAt: now,
      passwordExpiresAt: threeMonthsFromNow,
      lockoutUntil: null,
      passwordHistory: [],
      securityQuestions: [],
      preferences: {},
      profilePicture: null,
      lastLogin: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      forcePasswordChange: true, // Force password change on first login
      twoFactorEnabled: true, // Enable 2FA by default for security
      twoFactorMethod: 'email',
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      lastOtpTime: null,
      otpAttempts: 0,
      // Account unlock fields
      unlockToken: null,
      unlockTokenExpires: null,
      unlockOtp: null,
      unlockOtpExpires: null,
      unlockOtpAttempts: 0,
      lockReason: null,
      lockedBy: 'system',
      unlockRequested: false,
      unlockRequestedAt: null,
      createdAt: now,
      updatedAt: now
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', { email: 'godwinkiwovel@gmail.com' }, {});
  }
}; 