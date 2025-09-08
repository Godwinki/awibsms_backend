/**
 * Members Module Models
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

// Initialize models with sequelize instance
const Member = require('./Member')(sequelize, Sequelize.DataTypes);
const MemberAccount = require('./MemberAccount')(sequelize, Sequelize.DataTypes);
const MemberDocument = require('./MemberDocument')(sequelize, Sequelize.DataTypes);
const Beneficiary = require('./Beneficiary')(sequelize, Sequelize.DataTypes);
const EmergencyContact = require('./EmergencyContact')(sequelize, Sequelize.DataTypes);
const ContactCategory = require('./ContactCategory')(sequelize, Sequelize.DataTypes);
const CategoryMember = require('./CategoryMember')(sequelize, Sequelize.DataTypes);

module.exports = {
  Member,
  MemberAccount,
  MemberDocument,
  Beneficiary,
  EmergencyContact,
  ContactCategory,
  CategoryMember
};
