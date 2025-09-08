const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const superAdminUnlockController = require('../controllers/superAdminUnlockController');

const router = express.Router();

// All routes require super admin access
router.use(protect, restrictTo('super_admin'));

// Unlock another super admin account
router.post('/unlock', superAdminUnlockController.unlockSuperAdmin);

// Get locked super admin accounts
router.get('/locked', superAdminUnlockController.getLockedSuperAdmins);

// Check super admin security status
router.get('/security-status', superAdminUnlockController.checkSuperAdminSecurity);

module.exports = router;
