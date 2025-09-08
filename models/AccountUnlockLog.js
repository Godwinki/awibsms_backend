const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AccountUnlockLog = sequelize.define('AccountUnlockLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    adminId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM('unlock_initiated', 'unlock_completed', 'unlock_failed', 'otp_sent', 'otp_verified', 'password_reset'),
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unlockToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    unlockTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'expired', 'failed'),
      defaultValue: 'pending'
    }
  }, {
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['adminId']
      },
      {
        fields: ['unlockToken'],
        unique: true
      },
      {
        fields: ['status']
      }
    ]
  });

  AccountUnlockLog.associate = (models) => {
    AccountUnlockLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    AccountUnlockLog.belongsTo(models.User, {
      foreignKey: 'adminId',
      as: 'admin'
    });
  };

  return AccountUnlockLog;
};
