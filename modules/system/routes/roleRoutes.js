const express = require('express');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const { requirePermission } = require('../../auth/middleware/permissionMiddleware');
const roleController = require('../controllers/roleController');

const router = express.Router();

// All role routes require authentication
router.use(protect);

// Get all roles - temporarily use legacy auth for bootstrap
router.get('/', restrictTo('admin', 'super_admin'), roleController.getRoles);

// Get single role
router.get('/:id', restrictTo('admin', 'super_admin'), roleController.getRole);

// Create new role
router.post('/', restrictTo('admin', 'super_admin'), roleController.createRole);

// Update role
router.patch('/:id', restrictTo('admin', 'super_admin'), roleController.updateRole);

// Delete role
router.delete('/:id', restrictTo('admin', 'super_admin'), roleController.deleteRole);

// Role assignment routes
router.post('/assign', restrictTo('admin', 'super_admin'), roleController.assignRoleToUser);
router.delete('/users/:userId/roles/:roleId', restrictTo('admin', 'super_admin'), roleController.removeRoleFromUser);

module.exports = router;
