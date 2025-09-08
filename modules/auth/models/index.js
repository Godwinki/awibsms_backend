/**
 * Auth Module Models
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

// Initialize models with sequelize instance
const User = require('./User')(sequelize, Sequelize.DataTypes);
const LoginHistory = require('./LoginHistory')(sequelize, Sequelize.DataTypes);
const SecurityQuestion = require('./SecurityQuestion')(sequelize, Sequelize.DataTypes);

module.exports = {
  User,
  LoginHistory,
  SecurityQuestion
};
