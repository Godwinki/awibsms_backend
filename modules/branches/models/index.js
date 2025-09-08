// models/index.js
const { sequelize } = require('../../../core/database/database');

const Branch = require('./Branch')(sequelize, sequelize.Sequelize.DataTypes);

module.exports = {
  Branch
};
