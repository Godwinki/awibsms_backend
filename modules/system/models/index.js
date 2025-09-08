/**
 * System Models Index
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

const Setting = require('./Setting')(sequelize, Sequelize.DataTypes);
const ActivityLog = require('./ActivityLog')(sequelize, Sequelize.DataTypes);
const Role = require('./Role')(sequelize, Sequelize.DataTypes);
const Permission = require('./Permission')(sequelize, Sequelize.DataTypes);
const RolePermission = require('./RolePermission')(sequelize, Sequelize.DataTypes);
const UserRole = require('./UserRole')(sequelize, Sequelize.DataTypes);
const Shortcut = require('./Shortcut')(sequelize, Sequelize.DataTypes);
const UserShortcut = require('./UserShortcut')(sequelize, Sequelize.DataTypes);

module.exports = {
  Setting,
  ActivityLog,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Shortcut,
  UserShortcut
};


