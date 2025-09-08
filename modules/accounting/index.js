/**
 * Accounting Module
 * 
 * Handles double-entry bookkeeping, general ledger,
 * financial statements, and accounting compliance.
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
