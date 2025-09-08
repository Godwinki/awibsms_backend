const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActiveSession = sequelize.define('ActiveSession', {
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
    sessionToken: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    loginTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    lastActivity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    deviceInfo: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    location: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['sessionToken'],
        unique: true
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['lastActivity']
      }
    ]
  });

  ActiveSession.associate = (models) => {
    ActiveSession.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return ActiveSession;
};
