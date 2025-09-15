/**
 * AWIB SACCOS  Management System - Module Registry
 * 
 * This file serves as the central registry for all business modules.
 * Each module encapsulates a specific business domain with its own
 * controllers, models, services, and routes.
 */

const auth = require('./auth');
const members = require('./members');
const loans = require('./loans');
const accounting = require('./accounting');
const payments = require('./payments');
const savings = require('./savings');
const shares = require('./shares');
const budget = require('./budget');
const organization = require('./organization');
const content = require('./content');
const reports = require('./reports');
const notifications = require('./notifications');
const documents = require('./documents');
const system = require('./system');
const company = require('./company');
const branches = require('./branches');

module.exports = {
  auth,
  members,
  loans,
  accounting,
  payments,
  savings,
  shares,
  budget,
  organization,
  content,
  reports,
  notifications,
  documents,
  system,
  company,
  branches
};
