/**
 * Auth API Routes - Version 1
 */

const express = require('express');
const router = express.Router();

// Import auth module routes
const authModule = require('../../modules/auth');

// Mount auth routes - Order matters! 2FA routes must come before main auth routes
// because authRoutes has global protect middleware that would affect all subsequent routes
router.use('/2fa', authModule.routes.twoFactorRoutes);
router.use('/unlock', authModule.routes.unlockRoutes);
router.use('/super-admin', authModule.routes.superAdminRoutes);
router.use('/', authModule.routes.authRoutes);
router.use('/users', authModule.routes.userRoutes);
router.use('/users', authModule.routes.userPermissionRoutes);

module.exports = router;
