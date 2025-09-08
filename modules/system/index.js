/**
 * System Management Module
 * 
 * Handles system settings, activity logs,
 * diagnostics, and system administration.
 */

const controllers = require('./controllers');
const models = require('./models');
const routes = require('./routes');
const services = require('./services');
const validators = require('./validators');

module.exports = {
  controllers,
  models,
  routes,
  services,
  validators
};
