/**
 * Communications Module Routes
 * Handles SMS messaging, contact groups, campaigns, and balance management
 */

const express = require('express');
const router = express.Router();
const { readOnlyLimiter, resourceIntensiveLimiter } = require('../../../core/middleware/rateLimiter');

// Import specific route files
const smsRoutes = require('./smsRoutes');
const groupRoutes = require('./groupRoutes');
const campaignRoutes = require('./campaignRoutes');
const balanceRoutes = require('./balanceRoutes');

// Mount route handlers with appropriate rate limiters
// SMS routes - resource intensive due to external API calls
router.use('/sms', resourceIntensiveLimiter, smsRoutes);

// Groups routes - read-heavy, used by dashboard
router.use('/groups', readOnlyLimiter, groupRoutes);

// Campaigns routes - resource intensive for sending
router.use('/campaigns', resourceIntensiveLimiter, campaignRoutes);

// Balance routes - frequently checked by dashboard
router.use('/balance', readOnlyLimiter, balanceRoutes);

// Communications module health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    module: 'communications',
    timestamp: new Date().toISOString(),
    features: [
      'SMS messaging',
      'Contact groups',
      'SMS campaigns',
      'Balance monitoring',
      'Delivery tracking'
    ]
  });
});

module.exports = router;
