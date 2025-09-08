/**
 * Shortcut Model - Quick Actions System
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Shortcut = sequelize.define('Shortcut', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        isNumeric: true,
        len: [1, 10]
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'global',
      validate: {
        isIn: [['global', 'members', 'loans', 'accounting', 'reports', 'system', 'auth', 'budget', 'expenses']]
      }
    },
    actionType: {
      type: DataTypes.ENUM('navigation', 'modal', 'api_call', 'form'),
      allowNull: false,
      defaultValue: 'navigation'
    },
    actionData: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidActionData(value) {
          if (typeof value !== 'object' || value === null) {
            throw new Error('Action data must be a valid JSON object');
          }
        }
      }
    },
    requiredPermissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    requiredRoles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'System shortcuts cannot be deleted by users'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'general'
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Icon name for UI display'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'shortcuts',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['code']
      },
      {
        fields: ['module']
      },
      {
        fields: ['actionType']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['category']
      }
    ]
  });

  // Define associations
  Shortcut.associate = (models) => {
    // Shortcut belongs to User (creator)
    Shortcut.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Shortcut has many UserShortcuts (user customizations)
    Shortcut.hasMany(models.UserShortcut, {
      foreignKey: 'shortcutId',
      as: 'userCustomizations'
    });
  };

  return Shortcut;
};
