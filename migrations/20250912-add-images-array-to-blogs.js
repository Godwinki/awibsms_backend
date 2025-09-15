'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('blogs', 'images', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of blog image objects with URL, path, name, size, and alt text'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('blogs', 'images');
  }
};