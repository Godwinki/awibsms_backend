'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
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
      },
      onDelete: 'CASCADE'
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Roles',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'User who assigned this role'
    },
    assignedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Optional role expiration date'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    tableName: 'UserRoles',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'roleId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['roleId']
      }
    ]
  });

  UserRole.associate = function(models) {
    UserRole.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    UserRole.belongsTo(models.Role, {
      foreignKey: 'roleId',
      as: 'role'
    });

    UserRole.belongsTo(models.User, {
      foreignKey: 'assignedBy',
      as: 'assignor'
    });
  };

  return UserRole;
};
