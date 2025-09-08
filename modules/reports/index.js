/**
 * Reports & Analytics Module
 * 
 * Handles financial reports, analytics,
 * dashboard data, and business intelligence.
 */

const controllers = require('./controllers');
const services = require('./services');
const templates = require('./templates');
const generators = require('./generators');
const routes = require('./routes');

module.exports = {
  controllers,
  services,
  templates,
  generators,
  routes
};
