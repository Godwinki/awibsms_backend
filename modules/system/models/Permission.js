'use strict';
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z]+\.[a-z_]+\.[a-z_]+$/, // Format: module.resource.action
      }
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    module: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[a-z_]+$/
      }
    },
    resource: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[a-z_]+$/
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[a-z_]+$/
      }
    },
    isSystemPermission: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'System permissions cannot be deleted'
    }
  }, {
    timestamps: true,
    tableName: 'Permissions',
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['module']
      },
      {
        fields: ['resource']
      },
      {
        fields: ['action']
      }
    ]
  });

  Permission.associate = function(models) {
    // Many-to-many with Role through RolePermission
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: 'permissionId',
      otherKey: 'roleId',
      as: 'roles'
    });
  };

  return Permission;
};
