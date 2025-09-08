/**
 * Organization Management Module
 * 
 * Handles departments, employee leave management,
 * organizational structure and HR functions.
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
