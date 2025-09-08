const { User } = require('../models');
const { v4: uuidv4 } = require('uuid');

const seedAdminUser = async () => {
  try {
    console.log('🔧 Checking for admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: {
        email: 'godwinkiwovel@gmail.com'
      }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists'.green);
      return;
    }

    console.log('🌱 Creating admin user...');
    
    // Don't hash password here - let the User model's beforeSave hook handle it
    const now = new Date();
    const threeMonthsFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    
    await User.create({
      id: uuidv4(),
      firstName: 'Godwin',
      lastName: 'Kiwovele',
      email: 'godwinkiwovel@gmail.com',
      password: 'Admin@255', // Plain password - will be hashed by beforeSave hook
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
      forcePasswordChange: true,
      twoFactorEnabled: true,
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
      unlockRequestedAt: null
    });

    console.log('✅ Admin user created successfully'.green);
    console.log('📧 Email: godwinkiwovel@gmail.com'.cyan);
    console.log('🔐 Password: Admin@255'.cyan);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

module.exports = { seedAdminUser };
