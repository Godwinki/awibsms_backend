/**
 * System Controllers Index
 */

const settingController = require('./settingController');
const activityController = require('./activityController');
const roleController = require('./roleController');
const permissionController = require('./permissionController');

module.exports = {
  settingController,
  activityController,
  roleController,
  permissionController
};
