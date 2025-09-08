/**
 * Budget Models Index
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

const Budget = require('./Budget')(sequelize, Sequelize.DataTypes);
const BudgetAllocation = require('./BudgetAllocation')(sequelize, Sequelize.DataTypes);
const BudgetCategory = require('./BudgetCategory')(sequelize, Sequelize.DataTypes);

module.exports = {
  Budget,
  BudgetAllocation,
  BudgetCategory
};

