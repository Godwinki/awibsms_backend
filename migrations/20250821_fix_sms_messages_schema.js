'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Fix memberId column type mismatch
    await queryInterface.changeColumn('SmsMessages', 'memberId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // Add missing messageLength column if it doesn't exist
    const tableInfo = await queryInterface.describeTable('SmsMessages');
    if (!tableInfo.messageLength) {
      await queryInterface.addColumn('SmsMessages', 'messageLength', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert memberId back to UUID (though this may cause issues)
    await queryInterface.changeColumn('SmsMessages', 'memberId', {
      type: Sequelize.UUID,
      allowNull: true
    });

    // Remove the messageLength column
    await queryInterface.removeColumn('SmsMessages', 'messageLength');
  }
};
