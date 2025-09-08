'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Creating account types...');

      // Check if any account types already exist
      const existingAccountTypes = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM "AccountTypes"',
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (existingAccountTypes[0].count > 0) {
        console.log('ℹ️ Account types already exist. Skipping seeding.');
        return;
      }

      const accountTypes = [
        {
          name: 'SHARES',
          description: 'Share capital account - Minimum 100,000 TZS (1 share), Maximum 10 shares',
          minimumBalance: 100000.00,
          interestRate: 8.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'SAVINGS',
          description: 'Main mandatory savings account',
          minimumBalance: 10000.00,
          interestRate: 5.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'SAVINGS_VOLUNTARY',
          description: 'Voluntary savings account',
          minimumBalance: 5000.00,
          interestRate: 4.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'SAVINGS_TARGET',
          description: 'Target savings account',
          minimumBalance: 10000.00,
          interestRate: 6.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'SAVINGS_SPECIAL',
          description: 'Special savings account',
          minimumBalance: 20000.00,
          interestRate: 7.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'DEPOSITS',
          description: 'Fixed deposit account',
          minimumBalance: 100000.00,
          interestRate: 12.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'LOANS',
          description: 'Loan account',
          minimumBalance: 0.00,
          interestRate: 15.00,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await queryInterface.bulkInsert('AccountTypes', accountTypes);
      console.log(`✅ Successfully created ${accountTypes.length} account types`);

    } catch (error) {
      console.error('❌ Error creating account types:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Removing account types...');
      await queryInterface.bulkDelete('AccountTypes', null, {});
      console.log('✅ Account types removed successfully');
    } catch (error) {
      console.error('❌ Error removing account types:', error);
      throw error;
    }
  }
};
