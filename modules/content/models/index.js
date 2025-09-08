/**
 * Content Models Index
 */

const { sequelize, Sequelize } = require('../../../core/database/database');

const Blog = require('./Blog')(sequelize, Sequelize.DataTypes);
const Announcement = require('./Announcement')(sequelize, Sequelize.DataTypes);
const PublicDocument = require('./PublicDocument')(sequelize, Sequelize.DataTypes);
const DownloadLog = require('./DownloadLog')(sequelize, Sequelize.DataTypes);

module.exports = {
  Blog,
  Announcement,
  PublicDocument,
  DownloadLog
};


