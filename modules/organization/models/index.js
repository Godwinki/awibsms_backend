/**
 * Organization Models Index
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

const Department = require('./Department')(sequelize, Sequelize.DataTypes);

module.exports = {
  Department
};


