const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // BRANCH ASSOCIATION - Critical for multi-tenancy
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Branches',
        key: 'id'
      },
      comment: 'Users belong to a specific branch'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      unique: false, // Remove global uniqueness - will be unique per branch
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100] // Minimum 8 characters
      }
    },
    phoneNumber: {
      type: DataTypes.STRING,
      unique: false, // Remove global uniqueness - will be unique per branch
      validate: {
        is: /^\+?[1-9]\d{1,14}$/
      }
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'clerk',
      allowNull: false,
      comment: 'Legacy role field - use roles association for new role system'
    },
    profilePicture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    lastLogin: {
      type: DataTypes.DATE
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockoutUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isLocked: {
      type: DataTypes.VIRTUAL,
      get() {
        return Boolean(this.lockoutUntil && new Date(this.lockoutUntil) > new Date());
      }
    },
    lastPasswordChangedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    passwordResetToken: {
      type: DataTypes.STRING
    },
    passwordResetExpires: {
      type: DataTypes.DATE
    },
    passwordHistory: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    passwordExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        return date;
      },
    },
    forcePasswordChange: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    mustChangePassword: {
      type: DataTypes.VIRTUAL,
      get() {
        // Return true if forcePasswordChange is explicitly set
        if (this.forcePasswordChange) return true;
        
        // Return true if lastPasswordChangedAt is null (never changed password)
        if (!this.lastPasswordChangedAt) return true;
        
        // Check password expiration only if passwordExpiresAt is set
        if (this.passwordExpiresAt) {
          const now = new Date();
          const expiresAt = new Date(this.passwordExpiresAt);
          return now >= expiresAt;
        }
        
        return false;
      },
    },
    remainingLockoutTime: {
      type: DataTypes.VIRTUAL,
      get() {
        if (!this.lockoutUntil) return 0;
        const now = new Date();
        const lockoutTime = new Date(this.lockoutUntil);
        return Math.max(0, Math.ceil((lockoutTime - now) / 1000 / 60)); // Returns minutes
      }
    },
    securityQuestions: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    twoFactorMethod: {
      type: DataTypes.ENUM('email', 'sms'),
      defaultValue: 'email',
      allowNull: true
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    twoFactorBackupCodes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: true
    },
    lastOtpTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    otpAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Account unlock fields
    unlockToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    unlockTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    unlockOtp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    unlockOtpExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    unlockOtpAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lockedBy: {
      type: DataTypes.ENUM('system', 'admin'),
      defaultValue: 'system'
    },
    unlockRequested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    unlockRequestedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          // Hash password
          user.password = await bcrypt.hash(user.password, 12);
          
          // Update password history (keep last 5)
          if (user.passwordHistory) {
            user.passwordHistory = [...user.passwordHistory, user.password].slice(-5);
          } else {
            user.passwordHistory = [user.password];
          }
          
          // Update password change timestamp and expiration
          user.lastPasswordChangedAt = new Date();
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 3);
          user.passwordExpiresAt = expiresAt;
        }
      }
    },
    indexes: [
      // Branch-specific uniqueness constraints
      {
        unique: true,
        fields: ['branchId', 'email']
      },
      {
        unique: true,
        fields: ['branchId', 'phoneNumber']
      },
      // Performance indexes
      {
        fields: ['branchId']
      },
      {
        fields: ['email']
      },
      {
        fields: ['status']
      },
      {
        fields: ['role']
      },
      {
        fields: ['department']
      }
    ],
    scopes: {
      // Filter by branch
      byBranch(branchId) {
        return {
          where: {
            branchId: branchId
          }
        };
      },
      // Active users only
      active: {
        where: {
          status: 'active'
        }
      },
      // Combine branch and active
      activeBranch(branchId) {
        return {
          where: {
            branchId: branchId,
            status: 'active'
          }
        };
      }
    }
  });

  // Add associations
  User.associate = (models) => {
    // Branch association - Users belong to a branch
    if (models.Branch) {
      User.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }

    if (models.LoginHistory) {
      User.hasMany(models.LoginHistory, {
        foreignKey: 'userId',
        as: 'loginHistory'
      });
    }

    // New role system associations
    if (models.UserRole) {
      User.hasMany(models.UserRole, {
        foreignKey: 'userId',
        as: 'userRoles'
      });
    }

    if (models.Role) {
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: 'userId',
        otherKey: 'roleId',
        as: 'roles'
      });
    }

    if (models.ActivityLog) {
      User.hasMany(models.ActivityLog, {
        foreignKey: 'userId',
        as: 'activities'
      });
    }

    if (models.AccountUnlockLog) {
      User.hasMany(models.AccountUnlockLog, {
        foreignKey: 'userId',
        as: 'unlockLogs'
      });
    }

    if (models.ActiveSession) {
      User.hasMany(models.ActiveSession, {
        foreignKey: 'userId',
        as: 'activeSessions'
      });
    }
  };

  // Instance method to check passwords
  User.prototype.correctPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  // Instance method to create password reset token
  User.prototype.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
  };

  // Add method to check password history
  User.prototype.isPasswordPreviouslyUsed = async function(password) {
    for (const historicPassword of this.passwordHistory) {
      if (await bcrypt.compare(password, historicPassword)) {
        return true;
      }
    }
    return false;
  };

  // Create unlock token for admin-initiated unlock
  User.prototype.createUnlockToken = function() {
    const unlockToken = crypto.randomBytes(32).toString('hex');
    this.unlockToken = crypto
      .createHash('sha256')
      .update(unlockToken)
      .digest('hex');
    this.unlockTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return unlockToken;
  };

  // Generate unlock OTP
  User.prototype.generateUnlockOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    this.unlockOtp = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');
    this.unlockOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    this.unlockOtpAttempts = 0;
    return otp;
  };

  // Verify unlock OTP
  User.prototype.verifyUnlockOTP = function(candidateOtp) {
    if (!this.unlockOtp || !this.unlockOtpExpires) {
      return false;
    }
    
    if (Date.now() > this.unlockOtpExpires) {
      return false;
    }

    const hashedCandidate = crypto
      .createHash('sha256')
      .update(candidateOtp)
      .digest('hex');

    return hashedCandidate === this.unlockOtp;
  };

  // Clear unlock fields after successful unlock
  User.prototype.clearUnlockFields = function() {
    this.unlockToken = null;
    this.unlockTokenExpires = null;
    this.unlockOtp = null;
    this.unlockOtpExpires = null;
    this.unlockOtpAttempts = 0;
    this.unlockRequested = false;
    this.unlockRequestedAt = null;
    this.lockoutUntil = null;
    this.failedLoginAttempts = 0;
  };

  return User;
}; 
