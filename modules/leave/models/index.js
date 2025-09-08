/**
 * Leave Models Index
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

const Leave = require('./Leave')(sequelize, Sequelize.DataTypes);

module.exports = {
  Leave
};


