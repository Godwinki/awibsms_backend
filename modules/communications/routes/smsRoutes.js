/**
 * SMS Routes
 * Routes for individual SMS sending and management
 */

const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');

// Send individual SMS
router.post('/send', 
  protect, 
  requirePermission('communications.sms.send'), 
  smsController.sendSMS
);

// Test SMS service (admin only)
router.post('/test', 
  protect, 
  restrictTo('admin', 'super_admin'), 
  smsController.testSMS
);

// Get SMS history
router.get('/history', 
  protect, 
  requirePermission('communications.sms.view_history'), 
  smsController.getSMSHistory
);

// Get SMS details
router.get('/:id', 
  protect, 
  requirePermission('communications.sms.view_history'), 
  smsController.getSMSDetails
);

// Get SMS statistics
router.get('/stats/overview', 
  protect, 
  requirePermission('communications.sms.view_stats'), 
  smsController.getSMSStats
);

module.exports = router;
