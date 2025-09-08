/**
 * Documents Management Module
 * 
 * Handles document storage, public documents,
 * member documents, and document workflows.
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
