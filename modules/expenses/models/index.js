/**
 * Expenses Models Index
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

const ExpenseRequest = require('./ExpenseRequest')(sequelize, Sequelize.DataTypes);
const ExpenseItem = require('./ExpenseItem')(sequelize, Sequelize.DataTypes);

module.exports = {
  ExpenseRequest,
  ExpenseItem
};


