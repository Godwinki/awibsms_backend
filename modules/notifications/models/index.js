/**
 * Notifications Models Index
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

const Notification = require('./Notification')(sequelize, Sequelize.DataTypes);

module.exports = {
  Notification
};


