// models/index.js
const { sequelize } = require('../../../core/database/database');

const CompanySettings = require('./CompanySettings')(sequelize, sequelize.Sequelize.DataTypes);

module.exports = {
  CompanySettings
};
