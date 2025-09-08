/**
 * Content Controllers Index
 */

const blogController = require('./blogController');
const announcementController = require('./announcementController');
const publicDocumentController = require('./publicDocumentController');
const documentController = require('./documentController');

module.exports = {
  blogController,
  announcementController,
  publicDocumentController,
  documentController
};
