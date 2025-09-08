/**
 * Notifications & Communication Module
 * 
 * Handles notifications, announcements, email,
 * SMS, and member communication.
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
