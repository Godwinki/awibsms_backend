const express = require('express');
const router = express.Router();
const twoFactorController = require('../controllers/twoFactorController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes that don't require authentication
router.post('/request-otp', twoFactorController.requestOTP);
router.post('/verify-otp', twoFactorController.verifyOTP);

// Routes that require authentication
router.use(authMiddleware.protect);

// User 2FA management routes
router.post('/enable', twoFactorController.enable2FA);
router.post('/disable', twoFactorController.disable2FA);
router.post('/backup-codes', twoFactorController.generateBackupCodes);

module.exports = router;
