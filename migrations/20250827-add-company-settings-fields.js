// Migration to add new fields to CompanySettings table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns to CompanySettings table
    await queryInterface.addColumn('CompanySettings', 'displayName', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'companyCode'
    });

    await queryInterface.addColumn('CompanySettings', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'website'
    });

    await queryInterface.addColumn('CompanySettings', 'vision', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'description'
    });

    await queryInterface.addColumn('CompanySettings', 'mission', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'vision'
    });

    await queryInterface.addColumn('CompanySettings', 'coreValues', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      after: 'mission'
    });

    await queryInterface.addColumn('CompanySettings', 'logo', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'accountNumberLength'
    });

    console.log('✅ Added new columns to CompanySettings table successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added columns
    await queryInterface.removeColumn('CompanySettings', 'displayName');
    await queryInterface.removeColumn('CompanySettings', 'description');
    await queryInterface.removeColumn('CompanySettings', 'vision');
    await queryInterface.removeColumn('CompanySettings', 'mission');
    await queryInterface.removeColumn('CompanySettings', 'coreValues');
    await queryInterface.removeColumn('CompanySettings', 'logo');

    console.log('✅ Removed new columns from CompanySettings table successfully');
  }
};
