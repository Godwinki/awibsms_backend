/**
 * Authentication & Authorization Module
 * 
 * Handles user authentication, authorization, security,
 * password management, 2FA, and session management.
 */

const controllers = require('./controllers');
const models = require('./models');
const routes = require('./routes');
const services = require('./services');
const middleware = require('./middleware');
const validators = require('./validators');

module.exports = {
  controllers,
  models,
  routes,
  services,
  middleware,
  validators
};
