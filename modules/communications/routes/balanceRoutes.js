/**
 * SMS Balance Routes
 * Routes for SMS balance monitoring and history
 */

const express = require('express');
const router = express.Router();
const balanceController = require('../controllers/balanceController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');

// Get current SMS balance
router.get('/current', 
  protect, 
  requirePermission('communications.balance.view'), 
  balanceController.getCurrentBalance
);

// Get balance history
router.get('/history', 
  protect, 
  requirePermission('communications.balance.view'), 
  balanceController.getBalanceHistory
);

// Get balance statistics
router.get('/stats', 
  protect, 
  requirePermission('communications.balance.view'), 
  balanceController.getBalanceStats
);

// Manual balance update (admin only)
router.post('/update', 
  protect, 
  requirePermission('communications.balance.manage'), 
  balanceController.updateBalance
);

module.exports = router;
