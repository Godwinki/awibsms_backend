/**
 * UserShortcut Model - User Customizations for Shortcuts
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserShortcut = sequelize.define('UserShortcut', {
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
    shortcutId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'shortcuts',
        key: 'id'
      }
    },
    customCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        isNumeric: true,
        len: [1, 10]
      },
      comment: 'User\'s personal code override for this shortcut'
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Track how often user uses this shortcut'
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'User can disable shortcuts they don\'t want to see'
    }
  }, {
    tableName: 'user_shortcuts',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'shortcutId']
      },
      {
        unique: true,
        fields: ['userId', 'customCode']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['isFavorite']
      },
      {
        fields: ['usageCount']
      }
    ]
  });

  // Define associations
  UserShortcut.associate = (models) => {
    // UserShortcut belongs to User
    UserShortcut.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // UserShortcut belongs to Shortcut
    UserShortcut.belongsTo(models.Shortcut, {
      foreignKey: 'shortcutId',
      as: 'shortcut'
    });
  };

  return UserShortcut;
};
