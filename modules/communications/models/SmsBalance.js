// SmsBalance.js - Track SMS balance history
module.exports = (sequelize, DataTypes) => {
  const SmsBalance = sequelize.define('SmsBalance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    previousBalance: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    change: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    changeType: {
      type: DataTypes.ENUM('top_up', 'usage', 'refund', 'adjustment'),
      allowNull: true
    },
    description: {
      type: DataTypes.STRING
    },
    checkedById: {
      type: DataTypes.UUID,
      allowNull: true
    },
    checkedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    source: {
      type: DataTypes.ENUM('api_check', 'manual_entry', 'automatic_update'),
      allowNull: false,
      defaultValue: 'api_check'
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['checkedAt']
      },
      {
        fields: ['changeType']
      },
      {
        fields: ['source']
      },
      {
        fields: ['checkedById']
      }
    ]
  });

  SmsBalance.associate = (models) => {
    // Checked by User (optional)
    SmsBalance.belongsTo(models.User, {
      foreignKey: 'checkedById',
      as: 'balanceChecker'
    });
  };

  return SmsBalance;
};
