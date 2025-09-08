const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const userPermissionController = require('../controllers/userPermissionController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get current user's permissions
router.get('/me/permissions', userPermissionController.getMyPermissions);

// Admin routes for managing user permissions - temporarily use legacy auth
router.get('/:userId/permissions', restrictTo('admin', 'super_admin'), userPermissionController.getUserPermissions);
router.get('/:userId/roles', restrictTo('admin', 'super_admin'), userPermissionController.getUserRoles);
router.get('/:userId/check-permission', restrictTo('admin', 'super_admin'), userPermissionController.checkPermission);

module.exports = router;
