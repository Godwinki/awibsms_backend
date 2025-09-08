// modules/payments/models/index.js
const { sequelize, Sequelize } = require('../../../core/database/database');

const Payment = require('./Payment')(sequelize, Sequelize.DataTypes);

module.exports = {
  Payment
};


