/**
 * Loans Management Module
 * 
 * Handles loan applications, approvals, disbursements,
 * repayments, collections, and loan lifecycle management.
 */

const controllers = require('./controllers');
const models = require('./models');
const routes = require('./routes');
const services = require('./services');
const validators = require('./validators');
const workflows = require('./workflows');

module.exports = {
  controllers,
  models,
  routes,
  services,
  validators,
  workflows
};
