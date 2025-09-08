const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { protect, restrictTo } = require('../../auth/middleware/authMiddleware');
const { readOnlyLimiter } = require('../../../core/middleware/rateLimiter');

// Apply read-only rate limiter to GET endpoints
router.get('/', readOnlyLimiter, departmentController.getDepartments);

// Apply authentication for write operations
router.use(protect);

// Admin-only operations
router.post('/', restrictTo('super_admin'), departmentController.createDepartment);
router.patch('/:id', restrictTo('super_admin'), departmentController.updateDepartment);
router.delete('/:id', restrictTo('super_admin'), departmentController.deleteDepartment);

module.exports = router; 
