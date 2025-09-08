// modules/documents/models/index.js
const { sequelize, Sequelize } = require('../../../core/database/database');

const Receipt = require('./Receipt')(sequelize, Sequelize.DataTypes);

module.exports = {
  Receipt
};


