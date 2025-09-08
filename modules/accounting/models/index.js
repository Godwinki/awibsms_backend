/**
 * Accounting Models Index
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

const AccountType = require('./AccountType')(sequelize, Sequelize.DataTypes);
const Transaction = require('./Transaction')(sequelize, Sequelize.DataTypes);

module.exports = {
  AccountType,
  Transaction
};

