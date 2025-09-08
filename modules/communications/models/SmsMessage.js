// SmsMessage.js - Individual SMS messages sent
module.exports = (sequelize, DataTypes) => {
  const SmsMessage = sequelize.define('SmsMessage', {
    // Force model sync with alter:true by adding a comment
    // Updated: 2025-08-21T11:30:00 - Fixed messageLength column missing error - FORCE SYNC REQUIRED
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // BRANCH ASSOCIATION - SMS messages belong to a specific branch
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Branches',
        key: 'id'
      },
      comment: 'SMS messages belong to a specific branch'
    },
    recipientPhone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    messageType: {
      type: DataTypes.ENUM('otp', 'notification', 'campaign', 'unlock', 'general'),
      allowNull: false,
      defaultValue: 'general'
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed', 'expired'),
      allowNull: false,
      defaultValue: 'pending'
    },
    shootId: {
      type: DataTypes.STRING, // Kilakona API shoot ID
      allowNull: true
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'SmsCampaigns',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    memberId: {
      type: DataTypes.INTEGER, // INTEGER type to match Member model's auto-increment ID
      allowNull: true,
      references: {
        model: 'Members',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    sentById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cost: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0.00,
      allowNull: false
    },
    messageLength: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Length of the message in characters',
      validate: {
        min: 0
      }
    },
    smsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'Number of SMS units this message counts as',
      validate: {
        min: 1
      }
    }
  }, {
    timestamps: true,
    // Force table recreation with current schema
    sync: { force: true },
    indexes: [
      {
        fields: ['branchId']
      },
      {
        fields: ['recipientPhone']
      },
      {
        fields: ['status']
      },
      {
        fields: ['messageType']
      },
      {
        fields: ['campaignId']
      },
      {
        fields: ['memberId']
      },
      {
        fields: ['sentById']
      },
      {
        fields: ['shootId']
      },
      {
        fields: ['sentAt']
      },
      {
        fields: ['branchId', 'sentAt']
      }
    ]
  });

  SmsMessage.associate = (models) => {
    // Branch association - SMS messages belong to a branch
    if (models.Branch) {
      SmsMessage.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch'
      });
    }

    // Belongs to SMS Campaign (optional)
    SmsMessage.belongsTo(models.SmsCampaign, {
      foreignKey: 'campaignId',
      as: 'campaign',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Belongs to Member (optional) - explicitly handle INTEGER foreign key
    SmsMessage.belongsTo(models.Member, {
      foreignKey: 'memberId',
      as: 'member',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Sent by User - explicitly handle UUID foreign key
    SmsMessage.belongsTo(models.User, {
      foreignKey: 'sentById',
      as: 'messageSender',
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE'
    });

    // Has many status updates
    SmsMessage.hasMany(models.MessageStatus, {
      foreignKey: 'messageId',
      as: 'statusUpdates'
    });
  };
  
  return SmsMessage;
};
