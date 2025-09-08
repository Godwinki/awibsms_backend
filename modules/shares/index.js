/**
 * Shares Management Module
 * 
 * Handles share capital, share purchases,
 * dividends, and share ownership.
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
