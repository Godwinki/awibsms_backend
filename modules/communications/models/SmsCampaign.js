// SmsCampaign.js - Bulk SMS campaigns
module.exports = (sequelize, DataTypes) => {
  const SmsCampaign = sequelize.define('SmsCampaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'completed', 'cancelled', 'failed'),
      allowNull: false,
      defaultValue: 'draft'
    },
    targetType: {
      type: DataTypes.ENUM('all_members', 'specific_group', 'custom_list'),
      allowNull: false
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    scheduledAt: {
      type: DataTypes.DATE
    },
    startedAt: {
      type: DataTypes.DATE
    },
    completedAt: {
      type: DataTypes.DATE
    },
    totalRecipients: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    sentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    deliveredCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    failedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0.00
    },
    createdById: {
      type: DataTypes.UUID,
      allowNull: false
    },
    approvedById: {
      type: DataTypes.UUID,
      allowNull: true
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['targetType']
      },
      {
        fields: ['groupId']
      },
      {
        fields: ['createdById']
      },
      {
        fields: ['scheduledAt']
      },
      {
        fields: ['startedAt']
      }
    ]
  });

  SmsCampaign.associate = (models) => {
    // Belongs to ContactGroup (optional)
    SmsCampaign.belongsTo(models.ContactGroup, {
      foreignKey: 'groupId',
      as: 'targetGroup'
    });

    // Created by User
    SmsCampaign.belongsTo(models.User, {
      foreignKey: 'createdById',
      as: 'campaignCreator'
    });

    // Approved by User (optional)
    SmsCampaign.belongsTo(models.User, {
      foreignKey: 'approvedById',
      as: 'campaignApprover'
    });

    // Has many SMS messages
    SmsCampaign.hasMany(models.SmsMessage, {
      foreignKey: 'campaignId',
      as: 'messages'
    });
  };

  return SmsCampaign;
};
