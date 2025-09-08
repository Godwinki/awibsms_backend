/**
 * Savings Management Module
 * 
 * Handles member savings accounts, deposits,
 * withdrawals, and savings products.
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
