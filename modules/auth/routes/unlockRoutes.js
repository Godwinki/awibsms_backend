const express = require('express');
const router = express.Router();
const adminUnlockController = require('../controllers/adminUnlockController');
const userUnlockController = require('../controllers/userUnlockController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Admin routes (require authentication and admin privileges)
router.use('/admin', protect, restrictTo('admin', 'super_admin'));

// Admin unlock management routes
router.get('/admin/locked-accounts', adminUnlockController.getLockedAccounts);
router.post('/admin/unlock-account/:userId', adminUnlockController.initiateAccountUnlock);
router.get('/admin/unlock-logs', adminUnlockController.getUnlockLogs);
router.get('/admin/stats', adminUnlockController.getAdminStats);

// Public unlock routes (for users with unlock tokens)
router.get('/unlock/verify-token/:token', userUnlockController.verifyUnlockToken);
router.post('/unlock/verify-otp/:token', userUnlockController.verifyUnlockOTP);
router.post('/unlock/reset-password/:token', userUnlockController.resetPasswordAndUnlock);
router.post('/unlock/request-otp/:token', userUnlockController.requestNewUnlockOTP);

// Simplified unlock routes (email + OTP only)
router.post('/verify-otp-direct', userUnlockController.verifyOTPDirect);
router.post('/reset-password-direct', userUnlockController.resetPasswordDirect);

module.exports = router;
