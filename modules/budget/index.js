/**
 * Budget & Expenses Management Module
 * 
 * Handles budget planning, budget allocation,
 * expense tracking, and financial planning.
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
