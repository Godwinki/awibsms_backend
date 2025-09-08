/**
 * API Gateway - Version 1
 * 
 * Central routing for all API endpoints.
 * Routes requests to appropriate module controllers.
 */

const express = require('express');
const router = express.Router();

// Import module routes (only import completed modules)
const authRoutes = require('./auth');
const membersRoutes = require('../../modules/members/routes');
const budgetRoutes = require('../../modules/budget/routes');
const accountingRoutes = require('../../modules/accounting/routes');
const expensesRoutes = require('../../modules/expenses/routes');
const organizationRoutes = require('../../modules/organization/routes');
const contentRoutes = require('../../modules/content/routes');
const notificationsRoutes = require('../../modules/notifications/routes');
const systemRoutes = require('../../modules/system/routes');
const leaveRoutes = require('../../modules/leave/routes');
const paymentsRoutes = require('../../modules/payments/routes');
const documentsRoutes = require('../../modules/documents/routes');
const communicationsRoutes = require('../../modules/communications/routes');
const companyRoutes = require('../../modules/company/routes/companyRoutes');
const branchesRoutes = require('../../modules/branches/routes/branchRoutes');

// Mount module routes (only mount completed modules)
router.use('/auth', authRoutes);

// Backward compatibility routes
const userController = require('../../modules/auth/controllers/userController');
const blogRoutes = require('../../modules/content/routes/blogRoutes');
const announcementRoutes = require('../../modules/content/routes/announcementRoutes');
const { authLimiter } = require('../../core/middleware/rateLimiter');

// Auth backward compatibility
router.post('/users/login', authLimiter, userController.login);

// Content backward compatibility
router.use('/blogs', blogRoutes);
router.use('/announcements', announcementRoutes);
router.use('/members', membersRoutes);
router.use('/budget', budgetRoutes);
router.use('/accounting', accountingRoutes);
router.use('/expenses', expensesRoutes);
router.use('/organization', organizationRoutes);
router.use('/content', contentRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/system', systemRoutes);
router.use('/leave', leaveRoutes);
router.use('/payments', paymentsRoutes);
router.use('/documents', documentsRoutes);
router.use('/communications', communicationsRoutes);
router.use('/company', companyRoutes);
router.use('/branches', branchesRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    modules: {
      auth: 'active',
      members: 'active',
      budget: 'active',
      accounting: 'active',
      expenses: 'active',
      organization: 'active',
      content: 'active',
      notifications: 'active',
      system: 'active',
      leave: 'active',
      payments: 'active',
      documents: 'active',
      communications: 'active',
      company: 'active',
      branches: 'active'
    }
  });
});

module.exports = router;
