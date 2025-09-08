/**
 * Members Management Module
 * 
 * Handles member registration, KYC, member profiles,
 * member accounts, and member lifecycle management.
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
