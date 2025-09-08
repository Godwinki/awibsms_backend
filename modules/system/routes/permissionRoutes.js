const express = require('express');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');
const permissionController = require('../controllers/permissionController');

const router = express.Router();

// All permission routes require authentication
router.use(protect);

// Get all permissions - temporarily use legacy auth for bootstrap
router.get('/', restrictTo('admin', 'super_admin'), permissionController.getPermissions);

// Get single permission
router.get('/:id', restrictTo('admin', 'super_admin'), permissionController.getPermission);

// Create new permission
router.post('/', restrictTo('admin', 'super_admin'), permissionController.createPermission);

// Update permission
router.patch('/:id', restrictTo('admin', 'super_admin'), permissionController.updatePermission);

// Delete permission
router.delete('/:id', restrictTo('admin', 'super_admin'), permissionController.deletePermission);

// Get permission matrix
router.get('/matrix/view', restrictTo('admin', 'super_admin'), permissionController.getPermissionMatrix);

// Get module structure
router.get('/modules', restrictTo('admin', 'super_admin'), permissionController.getModuleStructure);

// Permission assignment routes
router.get('/roles/:roleId', restrictTo('admin', 'super_admin'), permissionController.getRolePermissions);
router.post('/roles/:roleId', restrictTo('admin', 'super_admin'), permissionController.assignPermissionToRole);
router.delete('/roles/:roleId/permissions/:permissionId', restrictTo('admin', 'super_admin'), permissionController.removePermissionFromRole);

module.exports = router;
